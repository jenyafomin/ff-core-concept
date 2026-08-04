/**
 * store-md-filefirst.test — ADR-0006 §(f) file-first «перо»: a hand-edited md file is AUTHOR-PRIMARY
 * (the write-model), and the journal act is DERIVED from the file diff. The engine is "first READER".
 *
 * The load-bearing claim this seals: **правишь .md руками → журнал УЗНАЁТ о правке** (it does not silently
 * diverge). Before this slice, `store-md.ts` carried a TODO(M3) and had NO path from a manual file edit to
 * an act — you could edit the .md and the graph would drift with no staleness marker. Here we:
 *   1. author a file-first md file directly on disk (no engine write),
 *   2. `ingest()` → a `source:'file-first'` act appears and the projection reflects the file,
 *   3. hand-edit the file → `detectStale()` surfaces the divergence BEFORE ingest (not silent),
 *   4. re-`ingest()` → a superseding act; the projection takes the freshest content.
 *
 * NOTE (bounds/forks): this drives the EXPLICIT ingest op, not a live watcher; the prose→envelope mapping
 * (TODO M3) and the §(g) eligibility whitelist are design forks left open in store-md.ts — see its docs.
 */
import { describe, it, expect } from 'vitest';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { MdEnvelopeStore, project, FILE_FIRST_SOURCE } from '../src/index.js';
import type { Act, EnvelopeNode } from '../src/index.js';

/** Author a file-first md file directly on disk (simulating a human editing the .md by hand). */
async function authorFile(root: string, id: string, body: string, kind = 'note'): Promise<void> {
  const nodesDir = join(root, 'nodes');
  await fs.mkdir(nodesDir, { recursive: true });
  const ts = '2026-08-04T00:00:00.000Z';
  const front = [
    '---',
    `id: ${id}`,
    `kind: ${kind}`,
    `title: ${id}`,
    'tags: []',
    'links: []',
    'importance: normal',
    `created: "${ts}"`,
    `updated: "${ts}"`,
    '---',
    body,
    '',
  ].join('\n');
  await fs.writeFile(join(nodesDir, `${id}.md`), front, 'utf8');
}

/** Project the accumulated file-first acts and read one node back (the read-model). */
function projectNode(acts: Act[], id: string): EnvelopeNode | undefined {
  return project(acts).get(id);
}

describe('store-md file-first ingest (ADR-0006 §f) — the journal learns of a manual edit', () => {
  it('authoring a file → ingest → a file-first act carrying the file content; projection reflects it', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'ff-filefirst-'));
    try {
      await authorFile(dir, 'doc:hello', 'version one');
      const store = new MdEnvelopeStore(dir);

      const acts = await store.ingest();
      expect(acts).toHaveLength(1);
      const act = acts[0];
      expect(act.actKind).toBe('domain_event');
      // The act is DERIVED from an author-primary file — carries the source marker (not a first-writer act).
      expect(typeof act.provenance).toBe('object');
      const prov = act.provenance as { source_ref: string; snapshotHash: string; source: string };
      expect(prov.source).toBe(FILE_FIRST_SOURCE);
      expect(prov.source_ref).toBe('doc:hello');
      expect(prov.snapshotHash).toMatch(/^sha256:/);
      expect((act.payload as { content: string }).content).toBe('version one');

      // The projection SEES the file content (domain_event folded into current-state).
      const node = projectNode(acts, 'doc:hello');
      expect(node?.type).toBe('note');
      expect((node?.body as { content?: string })?.content).toBe('version one');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('a hand-edit is NOT silent: detectStale surfaces the divergence before ingest, re-ingest supersedes', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'ff-filefirst-'));
    try {
      await authorFile(dir, 'doc:note', 'version one');
      const store = new MdEnvelopeStore(dir);

      const first = await store.ingest();
      expect(first).toHaveLength(1);
      // Freshly ingested → the read-model is in sync with the file (no staleness).
      expect(await store.detectStale()).toHaveLength(0);

      // The owner edits the .md by hand (author-primary file), OUT of band of any engine write.
      await authorFile(dir, 'doc:note', 'version two — hand edited');

      // ★ The journal does not know yet — but it is NOT silent: staleness is observable.
      const stale = await store.detectStale();
      expect(stale).toHaveLength(1);
      expect(stale[0]).toMatchObject({ id: 'doc:note', stale: true, source: FILE_FIRST_SOURCE });
      expect(stale[0].knownHash).not.toBe(stale[0].fileHash); // known ≠ file ⇒ read-model is behind

      // Ingest closes the gap: a superseding file-first act with the NEW snapshot hash.
      const second = await store.ingest();
      expect(second).toHaveLength(1);
      const p1 = first[0].provenance as { snapshotHash: string };
      const p2 = second[0].provenance as { snapshotHash: string };
      expect(p2.snapshotHash).not.toBe(p1.snapshotHash); // the diff produced a new act, not a no-op

      // After ingest the read-model is fresh again.
      expect(await store.detectStale()).toHaveLength(0);

      // Folding the whole (append-only) journal, freshest wins → projection = the hand-edited content.
      const node = projectNode([...first, ...second], 'doc:note');
      expect((node?.body as { content?: string })?.content).toBe('version two — hand edited');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('idempotent: an unchanged file yields no new act; a fresh store primed from the journal stays quiet', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'ff-filefirst-'));
    try {
      await authorFile(dir, 'doc:x', 'stable content');
      const store = new MdEnvelopeStore(dir);
      const acts = await store.ingest();
      expect(acts).toHaveLength(1);
      // Same file, no edit → no act (dedup by ref+snapshotHash).
      expect(await store.ingest()).toHaveLength(0);

      // A brand-new store (fresh boot) primed from the durable journal must not re-emit for the same file.
      const rebooted = new MdEnvelopeStore(dir);
      rebooted.primeFromActs(acts);
      expect(await rebooted.detectStale()).toHaveLength(0);
      expect(await rebooted.ingest()).toHaveLength(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('engine carriers are NOT treated as file-first: writeNode envelopes are ignored by ingest', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'ff-filefirst-'));
    try {
      const store = new MdEnvelopeStore(dir);
      // A carrier (engine's own projection on disk) — must NOT be mistaken for a hand-authored file.
      await store.writeNode({
        id: 'note:carrier',
        type: 'note',
        state: {},
        edges: [],
        view: [],
        visibility: {},
        access: {},
        acts: [],
        policy_ref: [],
        body: { text: 'engine-written, not author-primary' },
      });
      // A genuine hand-authored file alongside it.
      await authorFile(dir, 'doc:human', 'human authored');

      const acts = await store.ingest();
      expect(acts).toHaveLength(1); // only the hand-authored file, carrier excluded
      expect((acts[0].provenance as { source_ref: string }).source_ref).toBe('doc:human');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
