/**
 * cli-durable.test — R1 seal: the LIVE CLI runner actually consumes DurableFsStore (Ц1 "память навсегда").
 *
 * WHY THIS EXISTS: `DurableFsStore` was green in its own adapter tests, but the ONLY live runner
 * (surface/cli.ts) was hard-wired to `MemoryStore` — so at the product surface the durable journal was
 * never touched and "memory survives the process" was FALSELY green. This test snaps that false green:
 * it drives the real CLI entrypoint (`--store durable`) as a genuinely fresh OS process and proves it
 * reads an act off disk that NO in-memory store could have.
 *
 * Shape (mirrors durable-reboot-matrix's real-process discipline):
 *   P1 (in-process writer): construct DurableFsStore over the store-dir, engine.write() ONE domain_event,
 *      then close() — the act is fsync'd into journal.jsonl and the single-writer lock is released.
 *   P2 (spawned CLI, nothing shared but the disk dir): `node --import tsx cli.ts view --store durable
 *      --store-dir <dir>` — its Engine loads from the durable journal and the written node appears.
 *   Control: the SAME spawned CLI in default (memory) mode does NOT see the node — proving the only
 *      thing that carried it across the process boundary is the durable store reading disk.
 *
 * RED before the cli.ts wiring: `--store durable` did not exist, the CLI always built a MemoryStore, so
 * P2 saw an empty write-model. GREEN once the runner honors the flag and instantiates DurableFsStore.
 *
 * The corpus is the project's valid fixture (declares meta:type `event` etc.) so the `view` verb's
 * refuse-before-compute validator passes; the durable act projects into that declared `event` type.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DurableFsStore, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js';

const CLI = fileURLToPath(new URL('../src/surface/cli.ts', import.meta.url));
const ENGINE_DIR = fileURLToPath(new URL('..', import.meta.url)); // packages/engine — cwd so tsx resolves .js specifiers
const CORPUS = fileURLToPath(new URL('./fixtures/nodes.json', import.meta.url)); // valid meta-corpus (declares `event`)

/** The persisted subject the CLI must surface from disk. NOT in the corpus → only the disk journal can supply it. */
const SUBJECT = 'event:R1-durable-persist-1';
const VIEWER = 'agent:reader';

function corpusNodes(): EnvelopeNode[] {
  return (JSON.parse(readFileSync(CORPUS, 'utf8')) as { nodes: EnvelopeNode[] }).nodes;
}

function domainEvent(id: string, source_ref: string, snapshotHash: string, payload: Record<string, unknown>): Act {
  return {
    id,
    actor: 'sync:test',
    provenance: { source_ref, snapshotHash },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

/** Run the real CLI entrypoint as a fresh OS process; return exit status + captured stdout/stderr. */
function runCliProcess(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', CLI, ...args], { cwd: ENGINE_DIR, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('R1 — the live CLI runner consumes DurableFsStore (memory survives the process)', () => {
  it('a domain_event written by P1 is read off disk by a fresh CLI process in --store durable mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-cli-durable-'));
    try {
      // ── P1: write ONE act durably, then release the lock. Base = the corpus (constitution + meta), so the
      // written node reaches the CLI ONLY via the on-disk journal. `type:'event'` is a declared meta:type
      // (graph stays valid); `readable_by:['agent:*']` makes the projected node visible to VIEWER.
      const store = new DurableFsStore(dir, corpusNodes());
      const engine = new Engine(store, FIXED_POLICY);
      const ack = engine.write(
        domainEvent('act:R1-persist-1', SUBJECT, 'h1', { type: 'event', readable_by: ['agent:*'], note: 'durable survives' }),
      );
      expect(ack.ok, `P1 write failed: ${JSON.stringify(ack)}`).toBe(true);
      store.close(); // writeAct already fsync'd; this frees the single-writer lock for P2

      // ── P2: a genuinely fresh process — nothing shared with P1 but `dir` on disk.
      const durable = runCliProcess([
        'view', '--kind', 'visible-to', '--viewer', VIEWER,
        '--corpus', CORPUS, '--store', 'durable', '--store-dir', dir,
      ]);
      expect(durable.status, `CLI durable failed. stderr:\n${durable.stderr}`).toBe(0);
      const visibleIds = (JSON.parse(durable.stdout) as { ids: string[] }).ids;
      // The proof: the CLI's Engine, over DurableFsStore, loaded SUBJECT from the disk journal.
      expect(visibleIds).toContain(SUBJECT);

      // ── Control: the SAME CLI in default (memory) mode has an empty write-model → SUBJECT absent.
      const mem = runCliProcess([
        'view', '--kind', 'visible-to', '--viewer', VIEWER, '--corpus', CORPUS,
      ]);
      expect(mem.status, `CLI memory failed. stderr:\n${mem.stderr}`).toBe(0);
      const memIds = (JSON.parse(mem.stdout) as { ids: string[] }).ids;
      expect(memIds).not.toContain(SUBJECT);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
