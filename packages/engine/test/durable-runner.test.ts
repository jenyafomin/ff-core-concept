/**
 * durable-runner.test — P2 / SPINE: the runner binds Engine onto the durable store and SURVIVES a restart.
 *
 * Two properties, both in-process (a `restart()` = release the single-writer lock + re-boot over the SAME
 * store-dir, re-folding the journal off disk — the turn boundary without a new OS process; the real
 * cross-process seal is survive-turn.test):
 *
 *   1. survive-restart — a fact recorded before restart is present after restart, rebuilt from the DISK
 *      journal (version preserved). This works the moment the runner exists (durable store already durable).
 *   2. ★ idempotent-after-restart (the load-bearing RED) — a repeat record after restart with a DIFFERENT
 *      snapshotHash label is still a no-op, matched against the DISK journal by the R5 KERNEL content-hash.
 *      FAILS on the pre-wired engine (label mismatch ⇒ appends a duplicate across the reboot); GREEN once
 *      Engine.write dedups by `idempotencyHash`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DurableRunner, type Act, type EnvelopeNode } from '../src/index.js';

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

const SUBJECT = 'sheets:Orders#SPINE-1';

function domainEvent(id: string, snapshotHash: string, payload: Record<string, unknown>): Act {
  return { id, actor: 'sync:ga-rentacar', provenance: { source_ref: SUBJECT, snapshotHash }, recordedAt: '', actKind: 'domain_event', edges: [], payload };
}

let dir = '';
let runner: DurableRunner | undefined;
afterEach(() => {
  runner?.close();
  runner = undefined;
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('DurableRunner — the engine spine survives a restart on the same durable store (P2)', () => {
  it('a fact recorded before restart is restored from the disk journal after restart', () => {
    dir = mkdtempSync(join(tmpdir(), 'ff-spine-restore-'));
    runner = new DurableRunner({ storeDir: dir, base: [MIN_CONSTITUTION] });

    const ack = runner.record(domainEvent('act:1', 'h1', { type: 'order', total: 777, readable_by: ['agent:*'] }));
    expect(ack.ok).toBe(true);

    runner.restart(); // release lock + re-boot fresh store+engine over the same dir

    const node = runner.read(SUBJECT);
    expect(node, 'state must be rebuilt from the disk journal after restart').not.toBeNull();
    expect(node?.body?.total).toBe(777);
    expect(node?.state?.version).toBe(1); // rebuilt from the durable journal, not a fresh empty graph
  });

  it('★ a repeat record after restart is idempotent by CONTENT even with a different snapshotHash label', () => {
    dir = mkdtempSync(join(tmpdir(), 'ff-spine-idem-'));
    runner = new DurableRunner({ storeDir: dir, base: [MIN_CONSTITUTION] });

    runner.record(domainEvent('act:1', 'label-A', { type: 'order', total: 777, readable_by: ['agent:*'] }));
    expect(runner.acts()).toHaveLength(1);

    runner.restart();

    // Same projected content, DIFFERENT label + act id — must dedup against the DISK journal (R5).
    const again = runner.record(domainEvent('act:1-again', 'label-B', { type: 'order', total: 777, readable_by: ['agent:*'] }));
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.dedup).toBe(true);
    expect(runner.acts(), 'the durable journal must not grow a duplicate across the reboot').toHaveLength(1);
    expect(runner.read(SUBJECT)?.state?.version).toBe(1);
  });

  it('regression: a genuinely changed payload after restart supersedes (journal grows, freshest wins)', () => {
    dir = mkdtempSync(join(tmpdir(), 'ff-spine-supersede-'));
    runner = new DurableRunner({ storeDir: dir, base: [MIN_CONSTITUTION] });

    runner.record(domainEvent('act:1', 'h1', { type: 'order', total: 777, readable_by: ['agent:*'] }));
    runner.restart();
    runner.record(domainEvent('act:2', 'h2', { type: 'order', total: 999, readable_by: ['agent:*'] }));

    expect(runner.acts()).toHaveLength(2);
    expect(runner.read(SUBJECT)?.body?.total).toBe(999);
    expect(runner.read(SUBJECT)?.state?.version).toBe(2);
  });
});
