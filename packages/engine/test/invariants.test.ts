import { describe, it, expect } from 'vitest';
import { readFileSync, promises as fs } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  load,
  buildIndex,
  validate,
  assertValid,
  RefusalError,
  compile,
  costTree,
  visibleTo,
  loopGuard,
  treeIds,
  grandchildSum,
  admit,
  Engine,
  MemoryStore,
  MdEnvelopeStore,
  FIXED_POLICY,
  type Act,
  type EnvelopeNode,
  type Graph,
  type GraphContext,
} from '../src/index.js';
import * as publicApi from '../src/index.js';
// NAIVE is test-internal (not on the public entry). Importing it here from the internal path is the
// ONLY way to reach it — exactly the point of the hardening.
import { NAIVE_POLICY } from '../src/testing/policies.js';

const HERE = dirname(fileURLToPath(import.meta.url));
function corpus(name: string): EnvelopeNode[] {
  return (JSON.parse(readFileSync(join(HERE, 'fixtures', name), 'utf8')) as { nodes: EnvelopeNode[] }).nodes;
}

const viewGraph: Graph = load(corpus('nodes.json'));
const depth2Graph: Graph = load(corpus('nodes-depth2.json'));

// The view-corpus snapshots are readable_by ["agent:*"], so an authorized agent viewer reproduces the
// seed aggregation numbers while STILL routing every read through resolve() (no bypass).
const owner: GraphContext = { viewer: 'agent:ff-personal', policy: FIXED_POLICY };

describe('envelope validator — fail-closed BY BEHAVIOUR (refuse-before-compute)', () => {
  it('accepts the valid seed corpus', () => {
    expect(validate(viewGraph)).toEqual([]);
    expect(validate(depth2Graph)).toEqual([]);
  });

  it('reports problems on an invalid node (missing envelope field, dangling edge)', () => {
    const broken = load([
      // missing `body`, `policy_ref`, etc. + edge to a non-existent target + undeclared type
      { id: 'x:bad', type: 'gizmo', edges: [{ predicate: 'no-such-pred', target: 'x:ghost' }] } as unknown as EnvelopeNode,
    ]);
    const problems = validate(broken);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.message.includes('цель не существует'))).toBe(true);
  });

  it('REFUSES to compute a lens over an invalid graph (throws RefusalError, does not return a result)', () => {
    const broken = load([{ id: 'x:bad', type: 'gizmo' } as unknown as EnvelopeNode]);
    const run = compile({ kind: 'visible-to', body: { from: { type: '*' }, filter: [{ visible_to: '$viewer' }] } });
    // refuse BEFORE computing — behaviour, not exit code.
    expect(() => run(broken, owner)).toThrow(RefusalError);
    expect(() => assertValid(broken)).toThrow(RefusalError);
  });
});

describe('three proven lenses on the seed corpus (via compile)', () => {
  it('cost-tree: subtree rolls up real tokens (self 57400 + 3 children = 181946)', () => {
    const res = compile({
      kind: 'cost-tree',
      body: { from: 'agent:ff-personal', traverse: [{ pred: 'delegates-to', depth: '*' }], cost_via: { field: 'body.tokens' } },
    })(viewGraph, owner);
    expect(res.kind).toBe('cost-tree');
    if (res.kind !== 'cost-tree') throw new Error('unreachable');
    expect(res.tree.own).toBe(57400);
    expect(res.tree.children).toHaveLength(3);
    expect(res.tree.subtree).toBe(181946);
  });

  it('visible-to: routes through resolve() and returns readable node ids', () => {
    const res = compile({ kind: 'visible-to', body: { from: { type: '*' }, filter: [{ visible_to: '$viewer' }] } })(viewGraph, owner);
    if (res.kind !== 'visible-to') throw new Error('unreachable');
    // an authorized agent sees the snapshots; a guest sees strictly fewer.
    const guest = compile({ kind: 'visible-to', body: { from: { type: '*' }, filter: [{ visible_to: '$viewer' }] } })(viewGraph, {
      viewer: 'user:guest',
      policy: FIXED_POLICY,
    });
    if (guest.kind !== 'visible-to') throw new Error('unreachable');
    expect(res.ids).toContain('snapshot:main-self');
    expect(guest.ids.length).toBeLessThan(res.ids.length);
  });

  it('actions-by-agent: groups actions via the performs inverse', () => {
    const res = compile({ kind: 'actions-by-agent', body: { from: { type: 'action' } } })(viewGraph, owner);
    if (res.kind !== 'actions-by-agent') throw new Error('unreachable');
    const main = res.groups.find((g) => g.agent === 'agent:ff-personal');
    expect(main?.actions.map((a) => a.id)).toContain('action:synthesize');
    expect(main?.actions).toHaveLength(5);
    const expA = res.groups.find((g) => g.agent === 'agent:explorer-A');
    expect(expA?.actions).toHaveLength(1);
  });
});

describe('seed B ported — subtree≠direct (Q-10) + loop-guard (Q-9)', () => {
  it('subtree includes grandchildren; direct does not; delta === grandchild sum', () => {
    const tree = costTree(depth2Graph, 'agent:ff-personal', owner);
    expect(tree.subtree).toBe(391481);
    expect(tree.direct).toBe(238935);
    const delta = tree.subtree - tree.direct;
    expect(delta).toBe(152546);
    expect(delta).toBe(grandchildSum(tree));
  });

  it('loop-guard trips when a loop-run exceeds max_iterations', () => {
    const trips = loopGuard(depth2Graph);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({ loop: 'loop-run:2026-07-24-deep', max: 5, iters: 7, trippedAt: 6, action: 'halt+flag' });
  });

  it('cost-tree walk is iterative + bounded (deep chain / cycles do not overflow)', () => {
    // A self-referential delegation cycle must terminate (visited-set), and a huge depth bound is finite.
    const cyclic = load([
      { id: 'agent:a', type: 'agent', state: {}, edges: [{ predicate: 'delegates-to', target: 'agent:b' }], view: [], visibility: { readable_by: ['agent:*'] }, access: {}, acts: [], policy_ref: [], body: {} },
      { id: 'agent:b', type: 'agent', state: {}, edges: [{ predicate: 'delegates-to', target: 'agent:a' }], view: [], visibility: { readable_by: ['agent:*'] }, access: {}, acts: [], policy_ref: [], body: {} },
    ] as EnvelopeNode[]);
    const t = costTree(cyclic, 'agent:a', { viewer: 'agent:x', policy: NAIVE_POLICY, maxDelegationDepth: 100000 });
    expect(treeIds(t).length).toBeLessThan(5); // cycle guarded, not infinite
  });
});

describe('I-7 — resolve() is the ONLY visibility path (no bypass)', () => {
  it('visibleTo() == a manual resolve() filter over the same graph (it routes through the one PEP)', () => {
    const ctx: GraphContext = { viewer: 'agent:auditor', policy: FIXED_POLICY };
    const viaLens = visibleTo(viewGraph, ctx);
    const viaResolve = viewGraph.nodes.filter((n) => FIXED_POLICY.resolve('read', 'agent:auditor', n, viewGraph) === 'allow').map((n) => n.id);
    expect(viaLens).toEqual(viaResolve);
  });

  it('the edge index computes the inverse rather than storing it (DEC-12)', () => {
    const idx = buildIndex(viewGraph);
    expect(idx.inverseSources('agent:explorer-A', 'delegates-to')).toEqual(['agent:ff-personal']);
    expect(idx.storedEdgeCount).toBeGreaterThan(0);
  });

  it('the ungated NAIVE path is UNREACHABLE as a production Engine (fail-closed by construction)', () => {
    // (a) NAIVE is not on the public API surface — it can only be reached via the test-internal module.
    expect('FIXED_POLICY' in publicApi).toBe(true);
    expect('NAIVE_POLICY' in publicApi).toBe(false);
    expect('fixedPolicyWithStubbedAccessGate' in publicApi).toBe(false);

    // (b) Even holding a NAIVE policy, a caller cannot build an Engine with it — construction throws.
    const store = new MemoryStore(viewGraph.nodes);
    expect(() => new Engine(store, NAIVE_POLICY)).toThrow(/non-FIXED/);

    // (c) The Engine a normal caller CAN build gates the cost-tree: its viewer-scoped tree matches
    //     the FIXED (gated) result, never the ungated NAIVE one — for a limited viewer they differ.
    const engine = new Engine(store, FIXED_POLICY);
    const res = engine.view(
      { kind: 'cost-tree', body: { from: 'agent:ff-personal', traverse: [{ pred: 'delegates-to', depth: '*' }], cost_via: { field: 'body.tokens' } } },
      'agent:auditor',
    );
    if (res.kind !== 'cost-tree') throw new Error('unreachable');
    const gated = costTree(viewGraph, 'agent:ff-personal', { viewer: 'agent:auditor', policy: FIXED_POLICY });
    expect(res.tree.subtree).toBe(gated.subtree); // production Engine == gated path
  });
});

describe('admission-gate — no inline PII (ADR-0007 G3), fail-closed', () => {
  const base = { id: 'act:1', actor: 'agent:crm', provenance: 'ingest', recordedAt: '2026-07-26T00:00:00Z', actKind: 'domain_event' as const, edges: [] };

  it('REFUSES an act that inlines PII (customer name/phone)', () => {
    const inline: Act = { ...base, payload: { customerName: 'Ali Hassan', customerPhone: '+971501234567' } };
    const verdict = admit(inline);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/inline PII/i);
  });

  it('PASSES an act that references PII via payloadRef + payloadHash', () => {
    const ref: Act = { ...base, payloadRef: 'blob:order-4100', payloadHash: 'sha256:deadbeef' };
    expect(admit(ref).ok).toBe(true);
  });

  it('REFUSES a payloadRef without its content-hash (erasure must be verifiable)', () => {
    const ref: Act = { ...base, payloadRef: 'blob:order-4100' };
    expect(admit(ref).ok).toBe(false);
  });
});

describe('Engine.write — fail-closed BY BEHAVIOUR (refuse before any journal write)', () => {
  it('an inline-PII act is refused AND never reaches the append-only journal', () => {
    const store = new MemoryStore([]);
    const engine = new Engine(store, FIXED_POLICY);
    const ack = engine.write({ id: 'act:pii', actor: 'agent:crm', provenance: 'ingest', recordedAt: '', actKind: 'domain_event', edges: [], payload: { email: 'a@b.com' } });
    expect(ack.ok).toBe(false);
    expect(store.acts()).toHaveLength(0); // proves refuse-before-compute, not exit-code
  });

  it('a ref-only act is admitted, journaled, and gets an engine-assigned recordedAt', () => {
    const store = new MemoryStore([]);
    const engine = new Engine(store, FIXED_POLICY);
    const ack = engine.write({ id: 'act:ok', actor: 'agent:crm', provenance: 'ingest', recordedAt: 'CALLER-SUPPLIED-IGNORED', actKind: 'domain_event', edges: [], payloadRef: 'blob:x', payloadHash: 'sha256:1' });
    expect(ack.ok).toBe(true);
    if (ack.ok) expect(ack.act.recordedAt).not.toBe('CALLER-SUPPLIED-IGNORED'); // engine-assigned, immutable
    expect(store.acts()).toHaveLength(1);
  });
});

describe('store-md — @ff/core is a load-bearing dependency (depend, don\'t fork)', () => {
  it('round-trips an EnvelopeNode through @ff/core FileNodeStore persistence', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'ff-engine-md-'));
    try {
      const md = new MdEnvelopeStore(dir);
      const node: EnvelopeNode = {
        id: 'note:hello',
        type: 'note',
        state: {},
        edges: [],
        view: [],
        visibility: { readable_by: ['agent:*'] },
        access: {},
        acts: [],
        policy_ref: [],
        body: { text: 'persisted via @ff/core' },
      };
      await md.writeNode(node);
      const mem = await md.toMemoryStore();
      const back = mem.readNode('note:hello');
      expect(back?.type).toBe('note');
      expect(back?.body?.text).toBe('persisted via @ff/core');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
