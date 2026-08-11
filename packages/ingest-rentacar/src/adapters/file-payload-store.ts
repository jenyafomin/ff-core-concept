/**
 * FilePayloadStore — file-first PayloadStore (ADR-0006 default, spec §5). PII content is written to
 * `<dir>/<payloadHash>.json`; the act keeps only `payload://<hash>` + the hash + the hashScheme.
 *
 * SALT-IN-BLOB (①, 2026-08-07): the blob stores `{ salt, content }` and `payloadHash = sha256(salt ‖ content)`
 * where `salt` is 32 fresh high-entropy bytes. The salt lives ONLY in the blob — never in the act — so a
 * `shred` destroys the salt AND the content together. After a shred the retained `payloadHash` on the journal
 * is NO LONGER a brute-force oracle: an attacker cannot reproduce `sha256(salt ‖ candidate)` without the (now
 * gone) salt. This is what makes the erasure WITNESS honest for low-entropy PII (a phone ~10⁹, a name).
 *
 * ⚠ CONSEQUENCE / FORK (flagged, not decided here): with a random per-put salt this store is NO LONGER
 * content-addressed — identical PII yields a DIFFERENT `payloadHash`/blob each `put`. That is deliberate
 * (content-addressing an unsalted hash is exactly the oracle we removed). Engine idempotency is UNAFFECTED:
 * `Engine.write` dedups on `idempotencyHash` (source_ref + actKind + inline payload + edges), which excludes
 * `payloadRef`/`payloadHash` — so a re-sync of an unchanged row still dedups the ACT. The open item is
 * blob-level dedup + orphan blobs on re-sync (a `put` whose act is later deduped leaves a written blob).
 * TODO(T-D1b-salt-orphan-gc): decide GC of orphan salted blobs (ref-count on write, or sweep unreferenced).
 * Salt source is `crypto.randomBytes` (CSPRNG); a KMS/pepper alternative is out of scope for M1.
 *
 * This is the M1 default persistence. A DB/object-store PayloadStore is a swap-in behind the same port
 * (post-F-D) — the ingest never assumes files, it assumes the PayloadStore contract.
 */
import { mkdirSync, readFileSync, existsSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { hashOf } from '../core/hash.js';
import type { PayloadRef, PayloadStore } from '../ports/payload-store.js';

/** The salted hash scheme this store stamps. Recognized by engine erasure.ts::isWitnessNonReversible. */
export const HASH_SCHEME = 'salted-sha256-v1';

/** On-disk blob shape: the high-entropy salt travels WITH the content so a shred destroys both. */
interface SaltedBlob {
  salt: string;
  content: unknown;
}

export class FilePayloadStore implements PayloadStore {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  put(content: unknown): PayloadRef {
    const salt = randomBytes(32).toString('hex');
    // payloadHash = sha256(salt ‖ content). Salt is co-stored in the blob (co-shredded), never on the act.
    const payloadHash = hashOf({ salt, content } satisfies SaltedBlob);
    const file = this.fileFor(payloadHash);
    // A collision on the salted hash is astronomically unlikely; write only if absent (idempotent bytes).
    if (!existsSync(file)) writeFileSync(file, JSON.stringify({ salt, content }), 'utf8');
    return { payloadRef: `payload://${payloadHash}`, payloadHash, hashScheme: HASH_SCHEME };
  }

  get(payloadHash: string): unknown | null {
    const file = this.fileFor(this.hashOfRef(payloadHash));
    if (!existsSync(file)) return null;
    const blob = JSON.parse(readFileSync(file, 'utf8')) as SaltedBlob;
    return blob.content; // return only the content; the salt is store-internal
  }

  shred(ref: string): boolean {
    const file = this.fileFor(this.hashOfRef(ref));
    if (!existsSync(file)) return false; // idempotent: already gone
    // Crypto-shred: overwrite the bytes (salt + content) with random noise, THEN unlink — so the salt and
    // the payload are unrecoverable even from a raw disk read of the freed inode's prior contents.
    try {
      const size = statSync(file).size;
      writeFileSync(file, randomBytes(Math.max(size, 1)));
    } catch {
      /* best-effort overwrite; the unlink below is the authoritative removal */
    }
    rmSync(file, { force: true });
    return true;
  }

  /** Accept either a `payload://<hash>` ref or a bare hash. */
  private hashOfRef(ref: string): string {
    return ref.startsWith('payload://') ? ref.slice('payload://'.length) : ref;
  }

  private fileFor(payloadHash: string): string {
    return join(this.dir, `${payloadHash}.json`);
  }
}
