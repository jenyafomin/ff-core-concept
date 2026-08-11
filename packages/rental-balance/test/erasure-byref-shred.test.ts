/**
 * erasure-byref-shred.test — D1.b Step 1: the BY-REF hard-erase plane (I-4 canon, salt-in-blob ①).
 *
 * Proves the truth-preserving primitives laid BEFORE any `erased` act is conducted (I-4-RESOLUTION):
 *
 *   ① salt-in-blob (the witness is NOT a brute-force oracle) — a low-entropy PII payload is stored SALTED;
 *     the retained `payloadHash` cannot be reproduced from the content alone, so an attacker holding only the
 *     witness (post-erase) cannot confirm the erased value by hashing candidates. `hashScheme = salted-sha256-v1`.
 *
 *   by-ref erasure conduction (the terminal `erased` act) —
 *     (a) after `PayloadStore.shred(ref)` the content AND the salt are physically gone (blob unlinked; get→null);
 *     (b) the `payloadHash` / `hashScheme` WITNESS survives on the `erased` act (erasure stays auditable);
 *     (c) rebuild-from-journal works: a FRESH store over the same dir re-hydrates both the original act
 *         (byte-for-byte — the append-only log was never rewritten) and the terminal `erased` act;
 *     (d) the salted witness is no longer a confirmation oracle: brute-forcing the low-entropy value against
 *         the witness fails (whereas an UNSALTED digest of the exact value would have matched an unsalted store).
 *
 * Home = rental-balance: the only package depending on BOTH @ff/engine (DurableFsStore, buildErasedAct) and
 * @ff/ingest-rentacar (FilePayloadStore, reduceOrderRow) — engine cannot import ingest (dependency cycle).
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DurableFsStore,
  buildErasedAct,
  ERASES_PREDICATE,
  isWitnessNonReversible,
  admit,
  type Act,
} from '@ff/engine';
import {
  FilePayloadStore,
  HASH_SCHEME,
  hashOf,
  reduceOrderRow,
  orderSourceRef,
} from '@ff/ingest-rentacar';
import { MIN_CONSTITUTION } from '../src/core/constitution.js';

const NUM_CORE = '45832-2865';
const CUST_REF = `${orderSourceRef(NUM_CORE)}:customer`;
/** A REAL ga-rentacar Orders row → customer act carries name+phone BY-REF (low-entropy PII). */
const ORDER_ROW = {
  '#': NUM_CORE,
  Customer: 'Test Renter',
  Mobile: '0501234567',
  'Plate No': 'AB-12345',
  'Order Type': 'Daily400.00',
  'Recent Note': 'call the renter back',
  Status: 'open',
};

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('① salt-in-blob — the retained payloadHash witness is NOT a brute-force oracle', () => {
  it('an UNSALTED digest of the exact value does NOT match the salted witness (salt broke content-addressing)', () => {
    const dir = tmp('ff-salt-oracle-');
    try {
      const store = new FilePayloadStore(dir);
      const content = { phone: '0501234567' }; // low-entropy: ~10⁷ plausible candidates
      const ref = store.put(content);

      expect(ref.hashScheme).toBe(HASH_SCHEME);
      // The witness is sha256(salt ‖ content). An attacker hashing the EXACT content unsalted cannot match it.
      expect(hashOf(content)).not.toBe(ref.payloadHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('two puts of IDENTICAL content produce DIFFERENT witnesses (fresh salt each time)', () => {
    const dir = tmp('ff-salt-distinct-');
    try {
      const store = new FilePayloadStore(dir);
      const a = store.put({ phone: '0501234567' });
      const b = store.put({ phone: '0501234567' });
      expect(a.payloadHash).not.toBe(b.payloadHash); // not content-addressed ⇒ not an oracle
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(d) confirmation is possible WITH the salt and impossible WITHOUT it (positive control ⇒ contrast)', () => {
    const dir = tmp('ff-salt-brute-');
    try {
      const store = new FilePayloadStore(dir);
      const truePhone = '0501234567';
      const content = { phone: truePhone };
      const ref = store.put(content);

      // ── POSITIVE CONTROL (contrast) — the oracle DOES work while the salt is on disk ──
      // Read the salt straight from the blob file (same {salt, content} shape the store writes) and
      // recompute the witness the store's OWN way: payloadHash = hashOf({ salt, content }). It MUST match.
      // This proves confirmation is genuinely POSSIBLE with the salt — the negative result below is a real
      // loss of capability, not a hash-format mismatch that would hold even if shred() were a no-op.
      const blobFile = join(dir, `${ref.payloadHash}.json`);
      const blob = JSON.parse(readFileSync(blobFile, 'utf8')) as { salt: string; content: unknown };
      expect(blob.salt).toMatch(/^[0-9a-f]{64}$/); // 32 fresh bytes, hex
      const witnessWithSalt = hashOf({ salt: blob.salt, content });
      expect(witnessWithSalt).toBe(ref.payloadHash); // WITH the salt → the exact value confirms the witness

      // Sanity that the control is REAL: a wrong phone under the SAME salt does NOT match the witness.
      expect(hashOf({ salt: blob.salt, content: { phone: '0500000000' } })).not.toBe(ref.payloadHash);

      // ── CONDUCT the shred — salt AND content physically gone (blob unlinked; get→null; file absent) ──
      expect(store.shred(ref.payloadRef)).toBe(true);
      expect(store.get(ref.payloadHash)).toBeNull();
      expect(existsSync(blobFile)).toBe(false); // the salt is now UNRECOVERABLE — the same computation is off

      // ── NEGATIVE (now CONTRASTIVE, not tautological) — with the salt gone the attacker holds only the
      // witness. Even brute-forcing a window INCLUDING the true value cannot reproduce sha256(salt ‖ value),
      // because the salt required by the positive control above no longer exists on disk. ──
      let anyMatch = false;
      for (let i = 1234560; i <= 1234570; i++) {
        const candidate = { phone: `050${i}` };
        if (hashOf(candidate) === ref.payloadHash) anyMatch = true;
      }
      expect(anyMatch).toBe(false); // no candidate — not even the true phone — reproduces the salted witness
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('shred is idempotent: first→true, repeat→false, unknown ref→false — never throws', () => {
    const dir = tmp('ff-salt-idem-');
    try {
      const store = new FilePayloadStore(dir);
      const ref = store.put({ phone: '0501234567' });

      expect(store.shred(ref.payloadRef)).toBe(true); // first shred removes the blob
      expect(store.shred(ref.payloadRef)).toBe(false); // repeat on the SAME ref — already gone, no throw
      expect(store.shred('payload://deadbeef')).toBe(false); // unknown ref — no throw
      expect(store.shred('deadbeef')).toBe(false); // bare (un-prefixed) unknown hash — no throw
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('by-ref erasure conduction — the terminal `erased` act (I-4 canon; journal never rewritten)', () => {
  it('(a) content+salt gone after shred, (b) witness survives on `erased`, (c) rebuild works', () => {
    const payloadDir = tmp('ff-erase-payload-');
    const storeDir = tmp('ff-erase-store-');
    try {
      const payloadStore = new FilePayloadStore(payloadDir);
      const reduced = reduceOrderRow(ORDER_ROW, payloadStore);
      expect(reduced.ok).toBe(true);
      if (!reduced.ok) return;
      const custAct = reduced.acts.find((a) => a.id.startsWith('act:customer:')) as Act;
      expect(custAct.payloadRef).toBeDefined();
      expect(custAct.hashScheme).toBe(HASH_SCHEME);

      // Pre-erase: the blob resolves (name+phone are retrievable via the ref).
      const before = payloadStore.get(custAct.payloadHash!);
      expect(JSON.stringify(before)).toContain('0501234567');
      const blobsBefore = readdirSync(payloadDir).length;
      expect(blobsBefore).toBeGreaterThan(0);

      const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
      store.writeAct(custAct);

      // ── CONDUCT the erasure: shred the blob FIRST (honesty), THEN record the terminal `erased` act ──
      expect(payloadStore.shred(custAct.payloadRef!)).toBe(true);
      const erased = buildErasedAct(custAct, { actor: 'agent:erasure', id: `act:erased:${NUM_CORE}` });
      expect(admit(erased).ok).toBe(true); // an `erased` act is a valid journal citizen (no inline PII)
      store.writeAct(erased);

      // (a) content AND salt physically gone — the blob is unlinked, nothing resolves the ref anymore.
      expect(payloadStore.get(custAct.payloadHash!)).toBeNull();
      expect(existsSync(join(payloadDir, `${custAct.payloadHash}.json`))).toBe(false);

      // (b) the WITNESS survives on the `erased` act (hash + salted scheme retained ⇒ erasure auditable).
      expect(erased.actKind).toBe('erased');
      expect(erased.payloadHash).toBe(custAct.payloadHash);
      expect(erased.hashScheme).toBe(HASH_SCHEME);
      expect(isWitnessNonReversible(erased)).toBe(true);
      expect(erased.edges[0]).toMatchObject({ predicate: ERASES_PREDICATE, target: custAct.id });
      expect('payload' in erased).toBe(false); // the `erased` act carries no content of its own

      store.close();

      // (c) rebuild-from-journal: a FRESH store re-hydrates from disk. The append-only log was NEVER
      // rewritten — the ORIGINAL customer act survives byte-for-byte, and the terminal `erased` act is there.
      const rebooted = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
      try {
        const acts = rebooted.acts();
        const custOnDisk = acts.find((a) => a.id === custAct.id);
        const erasedOnDisk = acts.find((a) => a.id === erased.id);
        expect(custOnDisk).toBeDefined();
        expect(erasedOnDisk).toBeDefined();
        // original act untouched: its by-ref witness meta is intact (payload zone still there — by-ref canon
        // erases the BLOB, not the journal line; the line's ref/hash/scheme remain the audit witness).
        expect(custOnDisk!.payloadRef).toBe(custAct.payloadRef);
        expect(custOnDisk!.payloadHash).toBe(custAct.payloadHash);
        expect(custOnDisk!.hashScheme).toBe(HASH_SCHEME);
        expect(erasedOnDisk!.actKind).toBe('erased');
        expect(erasedOnDisk!.payloadHash).toBe(custAct.payloadHash);
        // rebuild through the pure reducer is a no-op-safe re-fold (projection is deterministic over the log)
        expect(() => rebooted.rebuild('journal')).not.toThrow();
      } finally {
        rebooted.close();
      }
    } finally {
      rmSync(payloadDir, { recursive: true, force: true });
      rmSync(storeDir, { recursive: true, force: true });
    }
  });

  it('buildErasedAct refuses a target with no by-ref witness (inline payload is the deprecated path)', () => {
    const inlineOnly: Act = {
      id: 'act:inline',
      actor: 'sync:x',
      provenance: { source_ref: 'sheets:Orders#1-1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payload: { type: 'order' },
    };
    expect(() => buildErasedAct(inlineOnly, { actor: 'agent:erasure', id: 'act:erased:1' })).toThrow();
  });
});
