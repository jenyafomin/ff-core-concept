import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  load,
  costTree,
  treeIds,
  visibleTo,
  FIXED_POLICY,
  type Decision,
  type Edge,
  type EnvelopeNode,
  type Graph,
  type PermissionPolicy,
} from '../src/index.js';
// NAIVE lives in a test-internal module (NOT re-exported from the package entry) — it is the ungated
// baseline used only to prove the FIXED fix is load-bearing. Production cannot reach it.
import { NAIVE_POLICY, fixedPolicyWithStubbedAccessGate } from '../src/testing/policies.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const readCorpus = (name: string): { nodes: EnvelopeNode[]; add_edges?: { from: string; edge: Edge }[] } =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', name), 'utf8'));

// ── merge overlay onto the real corpus (identical to run-capability.mjs) ──────────────────────
function mergedGraph(): Graph {
  const base = readCorpus('nodes.json');
  const over = readCorpus('nodes-cap.json');
  const byId = new Map<string, EnvelopeNode>(base.nodes.map((n) => [n.id, n]));
  for (const n of over.nodes) byId.set(n.id, { ...n });
  for (const ae of over.add_edges ?? []) {
    const host = byId.get(ae.from);
    if (host) host.edges = [...(host.edges ?? []), ae.edge];
  }
  return load([...byId.values()]);
}

const graph = mergedGraph();
const ALLOW: Decision = 'allow';
const DENY: Decision = 'deny';
const N = (id: string): EnvelopeNode => {
  const n = graph.byId.get(id);
  if (!n) throw new Error(`fixture node missing: ${id}`);
  return n;
};

// ── the 15 scenarios, exactly as run-capability.mjs run(mode) ─────────────────────────────────
function scenarios(p: PermissionPolicy): Record<string, Decision> {
  const R: Record<string, Decision> = {};
  R.S1 = p.resolveWrite('user:mallory', N('node:contested-doc'), graph);
  R.S2 = p.holdsCapability('user:jenya', 'core:external-irreversible', 'space:topic-private', graph) ? ALLOW : DENY;
  R.S3 = costTree(graph, 'agent:explorer-secret', { viewer: 'agent:auditor', policy: p }).own > 0 ? ALLOW : DENY;
  R.S4 = p.canMintGrant('user:mallory', N('grant:mallory-selfmint'), graph);
  R.S5 = p.canWriteNamespace('agent:vendor', 'meta:type/type', graph);
  R.S6 = p.valveGate(N('action:wire-money'), graph);
  R.S7 = p.holdsCapability('agent:vendor', 'finance:wire-transfer', 'project:ff', graph) ? ALLOW : DENY;
  R.S8 = p.resolveRead('agent:ff-personal', N('node:other-secret'), graph);
  R.S9 = p.delegatedCapability('agent:rogue-sub', 'core:external-irreversible', 'agent:ff-personal', 'project:ff', graph) ? ALLOW : DENY;
  R.S10 = p.canMintCapability('agent:vendor', 'vendor:delete-everything', graph);
  R.S11 = p.resolveWrite('user:mallory', N('node:contested-doc'), graph, { field: 'access.can_read' });
  R.S12 = treeIds(costTree(graph, 'agent:ff-personal', { viewer: 'agent:auditor', policy: p })).includes('agent:explorer-secret') ? ALLOW : DENY;
  R.L1 = p.resolveRead('user:jenya', N('output:msg-13types'), graph);
  R.L2 = p.holdsCapability('user:jenya', 'core:trigger-agent', 'project:ff', graph) ? ALLOW : DENY;
  R.L3 = p.resolveRead('agent:auditor', N('snapshot:explorer-A'), graph);
  return R;
}

const EXPECTED: Record<string, Decision> = {
  S1: DENY, S2: DENY, S3: DENY, S4: DENY, S5: DENY, S6: DENY, S7: DENY, S8: DENY, S9: DENY, S10: DENY, S11: DENY, S12: DENY,
  L1: ALLOW, L2: ALLOW, L3: ALLOW,
};
const KEYS = Object.keys(EXPECTED);

describe('capability killer-test — NAIVE 3/15 | FIXED 15/15 (real vitest assertions)', () => {
  const naive = scenarios(NAIVE_POLICY);
  const fixed = scenarios(FIXED_POLICY);

  it('FIXED gets every scenario right (15/15)', () => {
    for (const k of KEYS) expect(fixed[k], `FIXED ${k}`).toBe(EXPECTED[k]);
    const fixedPass = KEYS.filter((k) => fixed[k] === EXPECTED[k]).length;
    expect(fixedPass).toBe(15);
  });

  it('NAIVE gets only the 3 legit baselines right (3/15) — the fix is load-bearing', () => {
    const naivePass = KEYS.filter((k) => naive[k] === EXPECTED[k]).length;
    expect(naivePass).toBe(3);
    // the 3 it gets right are exactly the legitimate-access baselines
    expect(['L1', 'L2', 'L3'].every((k) => naive[k] === EXPECTED[k])).toBe(true);
    // every attack (S1–S12) is a breach under NAIVE
    for (const k of KEYS.filter((x) => x.startsWith('S'))) expect(naive[k], `NAIVE ${k} should breach`).not.toBe(EXPECTED[k]);
  });
});

describe('Hole A — dead meta-cap-gate / forge-access (red → green → mutation-guard)', () => {
  it('S11 red under NAIVE (forge allowed), green under FIXED (denied)', () => {
    expect(NAIVE_POLICY.resolveWrite('user:mallory', N('node:contested-doc'), graph, { field: 'access.can_read' })).toBe(ALLOW);
    expect(FIXED_POLICY.resolveWrite('user:mallory', N('node:contested-doc'), graph, { field: 'access.can_read' })).toBe(DENY);
  });

  it('mutation-guard: stubbing core:manage-access always-allow flips FIXED back to allow (gate is invoked, not dead)', () => {
    // isolate the control-field gate: a node mallory MAY write normally, no admin/space override.
    const g: Graph = load([
      ...graph.nodes,
      {
        id: 'node:forge-target',
        type: 'output',
        state: {},
        edges: [],
        view: [],
        visibility: { readable_by: ['agent:*'] },
        access: { can_read: ['agent:*'], can_write: ['user:mallory'] },
        acts: [],
        policy_ref: [],
        body: { synthetic: true },
      } as EnvelopeNode,
    ]);
    const target = g.byId.get('node:forge-target')!;

    // base write (no control field) is allowed → proves the ONLY difference is the control-field gate.
    expect(FIXED_POLICY.resolveWrite('user:mallory', target, g)).toBe(ALLOW);
    // writing a control field is denied by the live meta-cap gate…
    expect(FIXED_POLICY.resolveWrite('user:mallory', target, g, { field: 'access.can_read' })).toBe(DENY);
    // …and stubbing that gate to always-allow flips it back → the gate is genuinely on the write path.
    const stubbed = fixedPolicyWithStubbedAccessGate();
    expect(stubbed.resolveWrite('user:mallory', target, g, { field: 'access.can_read' })).toBe(ALLOW);
  });
});

describe('Hole B — tree-topology / numeric leak (red → green, PRUNED not zeroed)', () => {
  const naiveTree = costTree(graph, 'agent:ff-personal', { viewer: 'agent:auditor', policy: NAIVE_POLICY });
  const fixedTree = costTree(graph, 'agent:ff-personal', { viewer: 'agent:auditor', policy: FIXED_POLICY });

  it('red under NAIVE: secret id present in the tree AND its numeric cost leaks', () => {
    expect(treeIds(naiveTree)).toContain('agent:explorer-secret');
    const secretOwn = costTree(graph, 'agent:explorer-secret', { viewer: 'agent:auditor', policy: NAIVE_POLICY }).own;
    expect(secretOwn).toBeGreaterThan(0); // 99999 tokens leak into the auditor's rollup
  });

  it('green under FIXED: secret id ABSENT (branch pruned, not zeroed) AND numeric contribution absent', () => {
    expect(treeIds(fixedTree)).not.toContain('agent:explorer-secret');
    // assert on STRUCTURE, not on a zeroed value: the id simply does not appear as a node in the tree.
    const secretOwn = costTree(graph, 'agent:explorer-secret', { viewer: 'agent:auditor', policy: FIXED_POLICY }).own;
    expect(secretOwn).toBe(0);
    // FIXED total is strictly smaller than the leaked NAIVE total.
    expect(fixedTree.subtree).toBeLessThan(naiveTree.subtree);
  });

  it('everywhere-clause: the secret is absent from BOTH the plain query and the traversal under FIXED', () => {
    const seen = visibleTo(graph, { viewer: 'agent:auditor', policy: FIXED_POLICY });
    expect(seen).not.toContain('snapshot:explorer-secret'); // (1) plain query
    expect(seen).not.toContain('node:other-secret'); // tenant clamp (S8) too
    expect(treeIds(fixedTree)).not.toContain('agent:explorer-secret'); // (2) graph traversal
  });
});
