/**
 * F3 "Тест Чужого Читателя" — a gate WITH TEETH on V5 (portability): the unit's own access law must
 * be enforceable by a reader OUTSIDE `@ff/engine`, not only by the engine's own code.
 *
 * Design + adversarial verification:
 *   docs/02-project/core/01-brain/04-observer-mvp/adversarial-checkpoint-2026-09-04.analysis.md §3 (F3).
 *
 * WHAT THIS PROVES: `test/_throwaway/foreign-reader.mjs` is a separate `node` process — zero imports
 * from `packages/engine/src`, no `tsx`, no TypeScript — that knows exactly two wire facts (the
 * `readable_by` key name; freshest-wins-by-`recordedAt` on the append-only journal) and nothing else
 * about the schema. This test spawns it as a real child process against a REAL `DurableFsStore` journal
 * and shows it reproduces the unit's declared law: an owner-only self-owned record is served to
 * `viewer='owner'` and refused to `viewer='agent:stranger'`. If the wire law could only be enforced by
 * importing `resolve.ts`/`projection.ts`, this naive reader would get it wrong — GREEN means it doesn't.
 *
 * Unit under test: strictly SELF-OWNED — `census:2026-09-01:life-change-discipline` (`actor:'owner'`,
 * no `referent`), the same episode the real loading-census seed
 * (`scripts/loading-census-2026-09-01-seed.mjs`) wrote as `status:'intent', energy:'yes'`. A `referent
 * ≠ self` node is deliberately NOT used here (V7 consent risk, out of F3's scope — see checkpoint §3).
 *
 * ⚠️ Honest caveat (checkpoint §3, carried forward): `readable_by` is 0/30 in the REAL `.data` journal
 * today (every node is default-deny). This test therefore does NOT touch `packages/engine/.data/` at
 * all — it builds its OWN throwaway `DurableFsStore` journal in an mkdtemp'd directory and writes a
 * FABRICATED supersede act that adds `readable_by:['owner']` to a copy of the real episode's fields.
 * That is a falsification test of the hypothesis ("if a unit declared this law, would a foreign reader
 * honor it?"), not a claim that the owner's real data is protected today.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js';

const READER = fileURLToPath(new URL('./_throwaway/foreign-reader.mjs', import.meta.url));

/** Minimal, neutral ceiling — mirrors idempotency.test.ts's MIN_CONSTITUTION (no domain nouns). */
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

const SOURCE_REF = 'census:2026-09-01:life-change-discipline';

/** The real episode's fields, verbatim from EPISODES in loading-census-2026-09-01-seed.mjs. */
const EPISODE_FIELDS = {
  type: 'life-node',
  label: 'Дисциплина/режим',
  status: 'intent',
  summary: 'утренние подъёмы, дисциплина, дневной режим — без этого изменений не будет',
  category: 'life',
  energy: 'yes',
};

function domainEvent(id: string, snapshotHash: string, payload: Record<string, unknown>): Act {
  return {
    id,
    actor: 'owner',
    provenance: { source_ref: SOURCE_REF, snapshotHash },
    recordedAt: '', // engine-assigned
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

function runReader(journalPath: string, viewer: string): { allowed: boolean; body?: Record<string, unknown> } {
  const r = spawnSync(process.execPath, [READER, journalPath, SOURCE_REF, viewer], { encoding: 'utf8' });
  expect(r.status, `reader stderr: ${r.stderr}`).toBe(0);
  return JSON.parse(r.stdout.trim());
}

describe('F3 foreign-reader gate — an outside `node` process enforces the unit-declared readable_by law', () => {
  let storeDir: string | undefined;

  afterEach(() => {
    if (storeDir) rmSync(storeDir, { recursive: true, force: true });
    storeDir = undefined;
  });

  it('static: the reader script imports NOTHING from packages/engine/src (V5 boundary check)', () => {
    const src = readFileSync(READER, 'utf8');
    // The ONLY import statement in the whole file must be Node's own fs — checked on actual `import`
    // lines (not prose in comments, which legitimately discusses `@ff/engine`/`tsx` to explain why
    // they're absent).
    const imports = [...src.matchAll(/^import .* from ['"]([^'"]+)['"];?$/gm)].map((m) => m[1]);
    expect(imports).toEqual(['node:fs']);
    for (const spec of imports) {
      expect(spec).not.toMatch(/\/src\//);
      expect(spec).not.toBe('@ff/engine');
    }
  });

  it('RED→GREEN: viewer="owner" reads the body; viewer="agent:stranger" is refused — same freshest journal line', () => {
    storeDir = mkdtempSync(join(tmpdir(), 'ff-foreign-reader-'));
    const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY);

    // 1) genesis: the real episode, AS RECORDED originally — no readable_by (default-deny floor).
    const genesis = engine.write(domainEvent('act:census:2026-09-01:life-change-discipline', 'djb2:78f7b550', EPISODE_FIELDS));
    expect(genesis.ok).toBe(true);

    // 2) FABRICATED supersede: same source_ref, same fields, PLUS the declared law `readable_by:['owner']`.
    //    This is the falsification fixture — see the honest caveat in the file header.
    const supersede = engine.write(
      domainEvent('act:census:2026-09-01:life-change-discipline:owner-only', 'djb2:owner-only-v1', {
        ...EPISODE_FIELDS,
        readable_by: ['owner'],
      }),
    );
    expect(supersede.ok).toBe(true);
    store.close();

    const journalPath = join(storeDir, 'journal.jsonl');

    // Sanity: the on-disk wire shape really is `{...meta, erasable:{...}}`, not a flat `payload` key —
    // the reader's dual-key check (erasable/payload) is load-bearing, not decorative.
    const lastLine = JSON.parse(readFileSync(journalPath, 'utf8').trim().split('\n').at(-1)!);
    expect(lastLine.erasable?.readable_by).toEqual(['owner']);
    expect(lastLine.payload).toBeUndefined();

    const ownerResult = runReader(journalPath, 'owner');
    expect(ownerResult.allowed).toBe(true);
    expect(ownerResult.body).toMatchObject({ label: 'Дисциплина/режим', summary: EPISODE_FIELDS.summary });
    expect(ownerResult.body?.readable_by).toBeUndefined(); // reserved key does not leak into the served body

    const strangerResult = runReader(journalPath, 'agent:stranger');
    expect(strangerResult.allowed).toBe(false);
    expect(strangerResult.body).toBeUndefined();
  });

  it('fail-closed: a source_ref whose freshest line declares NO readable_by is refused for every viewer', () => {
    storeDir = mkdtempSync(join(tmpdir(), 'ff-foreign-reader-'));
    const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY);

    const genesis = engine.write(domainEvent('act:census:2026-09-01:life-change-discipline', 'djb2:78f7b550', EPISODE_FIELDS));
    expect(genesis.ok).toBe(true);
    store.close();

    const journalPath = join(storeDir, 'journal.jsonl');
    expect(runReader(journalPath, 'owner').allowed).toBe(false); // no readable_by ⇒ deny even the owner
    expect(runReader(journalPath, 'agent:*').allowed).toBe(false);
  });
});
