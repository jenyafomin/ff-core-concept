/**
 * idempotency.test — P1 / R5: idempotency as a KERNEL content-hash, not a caller-supplied label.
 *
 * The load-bearing RED is `dedup by CONTENT, not by snapshotHash`: the OLD Engine.write keyed dedup on
 * `provenance.snapshotHash` (a caller label), so a byte-identical record carrying a DIFFERENT snapshotHash
 * would append a redundant supersede. R5 computes the discriminant in the kernel (core/idempotency.ts) over
 * the act's real content, so the re-write is a no-op regardless of the label. That assertion FAILS on the
 * pre-wired engine (log grows to 2, dedup=false) and GREENs once Engine.write consumes `idempotencyHash`.
 */
import { describe, it, expect } from 'vitest';
import { Engine, MemoryStore, FIXED_POLICY, idempotencyHash, type Act, type EnvelopeNode } from '../src/index.js';

const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read: [], protected_namespaces: [], default: 'deny' },
};

function domainEvent(id: string, source_ref: string, snapshotHash: string, payload: Record<string, unknown>): Act {
  return { id, actor: 'sync:test', provenance: { source_ref, snapshotHash }, recordedAt: '', actKind: 'domain_event', edges: [], payload };
}

function newEngine() {
  const store = new MemoryStore([MIN_CONSTITUTION]);
  return { store, engine: new Engine(store, FIXED_POLICY) };
}

describe('idempotencyHash — deterministic, content-addressed, label-independent (R5)', () => {
  it('is deterministic and ignores id / recordedAt / actor / snapshotHash (same content ⇒ same hash)', () => {
    const a = domainEvent('act:1', 'order:1', 'h1', { type: 'order', total: 500 });
    const b: Act = { ...a, id: 'act:1-again', recordedAt: '2026-08-04T00:00:00Z', actor: 'sync:other', provenance: { source_ref: 'order:1', snapshotHash: 'DIFFERENT-LABEL' } };
    expect(idempotencyHash(a)).toBe(idempotencyHash(b));
    expect(idempotencyHash(a)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('changes when the projected CONTENT changes (payload or source_ref or edges)', () => {
    const base = domainEvent('act:1', 'order:1', 'h1', { type: 'order', total: 500 });
    expect(idempotencyHash({ ...base, payload: { type: 'order', total: 999 } })).not.toBe(idempotencyHash(base));
    expect(idempotencyHash({ ...base, provenance: { source_ref: 'order:2', snapshotHash: 'h1' } })).not.toBe(idempotencyHash(base));
    expect(idempotencyHash({ ...base, edges: [{ predicate: 'linked-to', target: 'X' }] })).not.toBe(idempotencyHash(base));
  });
});

describe('Engine.write idempotency is by kernel content-hash, not by the caller label (R5)', () => {
  // ★ THE RED: identical content, DIFFERENT snapshotHash label ⇒ still a no-op (dedup), log does not grow.
  it('a re-write with the SAME content but a DIFFERENT snapshotHash label dedups (not a redundant supersede)', () => {
    const { store, engine } = newEngine();
    const first = engine.write(domainEvent('act:o1', 'sheets:Orders#100', 'label-A', { type: 'order', total: 500 }));
    const second = engine.write(domainEvent('act:o1-again', 'sheets:Orders#100', 'label-B', { type: 'order', total: 500 }));

    expect(first.ok).toBe(true);
    if (first.ok) expect(first.dedup).toBeFalsy();
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.dedup).toBe(true);       // recognized by CONTENT despite the new label
    expect(store.acts()).toHaveLength(1);                  // the log did NOT grow a redundant supersede
    const node = store.load().find((n) => n.id === 'sheets:Orders#100');
    expect(node?.state?.version).toBe(1);                  // one folded act, not two
  });

  it('regression: a genuinely CHANGED payload still supersedes (log grows, freshest wins)', () => {
    const { store, engine } = newEngine();
    engine.write(domainEvent('act:o1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 }));
    engine.write(domainEvent('act:o2', 'sheets:Orders#100', 'h2', { type: 'order', total: 999 }));
    expect(store.acts()).toHaveLength(2);
    const node = store.load().find((n) => n.id === 'sheets:Orders#100');
    expect(node?.body).toEqual({ total: 999 });
    expect(node?.state?.version).toBe(2);
  });

  // ★ THE HOLE (M2 same-as re-merge regression): content that RECURS after an intervening supersede is a
  //   genuine state transition, NOT a duplicate. Dedup keys on the CURRENT (last) act for the source_ref,
  //   so re-establishing an earlier content — different seq/intent, byte-identical to a now-SUPERSEDED act —
  //   must APPEND, never dedup to a no-op. (Matching all history swallowed the re-merge; this guards it.)
  it('same content as a SUPERSEDED act, re-written after an intervening change, does NOT dedup (re-merge hole)', () => {
    const { store, engine } = newEngine();
    // A = an "active" state (mirrors a same-as confirm: edge present).
    const active = (id: string, seq: string): Act => ({
      id,
      actor: 'agent:dedup',
      provenance: { source_ref: 'node:A', snapshotHash: seq },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'same-as', target: 'node:B', meta: { tombstone: false } }],
    });
    // B = the "toggled-off" state (mirrors an un-merge: same edge, tombstoned → DIFFERENT content).
    const tombstoned: Act = {
      id: 'act:unmerge',
      actor: 'agent:dedup',
      provenance: { source_ref: 'node:A', snapshotHash: 'seq-2' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'same-as', target: 'node:B', meta: { tombstone: true } }],
    };

    const confirm = engine.write(active('act:confirm', 'seq-1'));
    expect(confirm.ok).toBe(true);
    if (confirm.ok) expect(confirm.dedup).toBeFalsy();

    const unmerge = engine.write(tombstoned); // intervening change: current act is now the tombstone
    expect(unmerge.ok).toBe(true);
    if (unmerge.ok) expect(unmerge.dedup).toBeFalsy();

    // re-merge: byte-identical CONTENT to `confirm` (only snapshotHash/seq + id differ) — but `confirm` is
    // no longer current, so this is a REAL toggle, not a no-op. It MUST append (dedup === false).
    const remerge = engine.write(active('act:remerge', 'seq-3'));
    expect(remerge.ok).toBe(true);
    if (remerge.ok) expect(remerge.dedup).toBeFalsy(); // ← the load-bearing assertion (was silently true)
    expect(store.acts()).toHaveLength(3); // all three toggles appended — none swallowed

    // guard the other direction: a byte-identical re-write of the CURRENT act (no intervening change) still dedups.
    const noop = engine.write(active('act:remerge-again', 'seq-4'));
    expect(noop.ok).toBe(true);
    if (noop.ok) expect(noop.dedup).toBe(true); // same content AND currently active ⇒ true no-op
    expect(store.acts()).toHaveLength(3); // did not grow
  });
});
