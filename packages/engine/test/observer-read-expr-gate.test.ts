/**
 * F2 "read-expr" — a gate WITH TEETH (can fail), not a regression test of an existing feature.
 *
 * Design + adversarial verification:
 *   docs/02-project/core/01-brain/04-observer-mvp/adversarial-checkpoint-2026-09-04.analysis.md §3 (F2).
 *
 * WHAT THIS PROVES: `body.read_expr` (a composite AND/OR/NOT AST over group membership) is a rule-as-data
 * primitive the ENGINE DOES NOT IMPLEMENT. `resolveRead()` (packages/engine/src/core/resolve.ts:242-243)
 * is a flat `||` of two allowlists (`visibility.readable_by`, `access.can_read`); there is no per-viewer
 * NEGATION and no AND/OR composition on the read path (grep for `read_expr|acl_expr|all_of|any_of` across
 * `src/` = 0 hits). This test builds a unit whose composite law says "family AND NOT estranged", makes the
 * FLAT allowlist ALLOW the viewer (so the engine has something to say yes to), and compares the engine's
 * verdict against a throwaway oracle (`test/_throwaway/read-expr-oracle.ts`) that interprets ONLY
 * `read_expr`. GREEN on this test means the DIVERGENCE is confirmed: the engine ALLOWs where the
 * composite law would DENY — i.e. the law lives in `resolve.ts`'s fixed combinator, not in the unit's own
 * data. If a future change teaches the engine to read `body.read_expr` and fold it into the read decision,
 * this test starts FAILING (engineDecision would flip to 'deny') — that is the intended tripwire.
 *
 * ⚠️ Honest rationale (per critic correction, checkpoint §3): the asymmetry is NOT that
 * "`policy:access-priority` governs write but not read" — that policy node is ASPIRATIONAL and is never
 * read by the engine (`resolve.ts:8` is a comment, not a consulted field; grep confirms no code path reads
 * `policy:access-priority`). The REAL asymmetry: WRITE has a per-subject DENY via capability grants
 * (`holdsCapability`, resolve.ts:151-176, deny-wins fold) — i.e. write already supports negation of a
 * subject's reach. READ has no equivalent per-viewer negation mechanism at all — `resolveRead` only ever
 * ADDS viewers via two allowlists and clamps by exact-id/namespace/tenant, never by a viewer-authored
 * boolean expression. `read_expr` would be a genuinely NEW capability, not a wiring gap.
 *
 * ⚠️ `f2-closure.test.ts` already exists in this directory and is UNRELATED (SubjectRoleAssurance /
 * consent-by-ref / owner-referent kernel-lock, wave2 critic attacks) — deliberately NOT reusing that name.
 */
import { describe, it, expect } from 'vitest';
import { FIXED_POLICY, type Decision, type EnvelopeNode, type Graph } from '../src/index.js';
import { oracleResolveRead, type ReadExprAST } from './_throwaway/read-expr-oracle.js';

const ALLOW: Decision = 'allow';
const DENY: Decision = 'deny';

function graphOf(nodes: EnvelopeNode[]): Graph {
  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])) };
}

describe('F2 read-expr gate — composite per-viewer-negatable law vs the real flat allowlist engine', () => {
  it('RED CASE: viewer in family AND estranged — oracle DENIES (NOT estranged fails), engine ALLOWS (flat readable_by matches)', () => {
    const viewer = 'user:viewer';

    // Fixture-only group nodes (see oracle header) — NOT a production node type.
    const familyGroup: EnvelopeNode = {
      id: 'group:family',
      type: 'group',
      body: { members: [viewer, 'user:mom'] },
    };
    const estrangedGroup: EnvelopeNode = {
      id: 'group:estranged',
      type: 'group',
      body: { members: [viewer] }, // viewer is ALSO estranged
    };

    const readExpr: ReadExprAST = {
      op: 'AND',
      terms: [{ op: 'member', group: 'family' }, { op: 'NOT', terms: [{ op: 'member', group: 'estranged' }] }],
    };

    const unit: EnvelopeNode = {
      id: 'unit:family-photo-1',
      type: 'domain_event',
      state: {},
      edges: [],
      view: [],
      // Engine's OWN flat allowlist mechanism — matches `viewer` literally so resolveRead has an ALLOW
      // to give. This is deliberately independent of `read_expr` below (that's the whole point of F2).
      visibility: { readable_by: [viewer] },
      access: {},
      acts: [],
      policy_ref: [],
      body: { read_expr: readExpr },
    };

    const graph = graphOf([familyGroup, estrangedGroup, unit]);

    const engineDecision = FIXED_POLICY.resolveRead(viewer, unit, graph);
    const oracleDecision = oracleResolveRead(unit, viewer, graph);

    expect(oracleDecision).toBe(DENY); // composite law: family AND NOT estranged → viewer fails NOT-estranged
    expect(engineDecision).toBe(ALLOW); // engine only ever consulted the flat readable_by allowlist → matches, ALLOW
    expect(engineDecision).not.toBe(oracleDecision); // THE GAP: read_expr is data the engine never reads
  });

  it('sanity: the oracle alone tracks AND/OR/NOT correctly (not a vacuously-true comparison)', () => {
    const viewer = 'user:viewer';
    const familyGroup: EnvelopeNode = { id: 'group:family', type: 'group', body: { members: [viewer] } };
    const estrangedGroup: EnvelopeNode = { id: 'group:estranged', type: 'group', body: { members: [] } };
    const graph = graphOf([familyGroup, estrangedGroup]);

    const andExpr: ReadExprAST = {
      op: 'AND',
      terms: [{ op: 'member', group: 'family' }, { op: 'NOT', terms: [{ op: 'member', group: 'estranged' }] }],
    };
    const nodeAllow: EnvelopeNode = { id: 'unit:x', type: 'domain_event', body: { read_expr: andExpr } };
    expect(oracleResolveRead(nodeAllow, viewer, graph)).toBe(ALLOW); // family, not estranged → allow

    const orExpr: ReadExprAST = { op: 'OR', terms: [{ op: 'member', group: 'estranged' }, { op: 'member', group: 'family' }] };
    const nodeOr: EnvelopeNode = { id: 'unit:y', type: 'domain_event', body: { read_expr: orExpr } };
    expect(oracleResolveRead(nodeOr, viewer, graph)).toBe(ALLOW); // OR — family branch true

    const noExprNode: EnvelopeNode = { id: 'unit:z', type: 'domain_event', body: {} };
    expect(oracleResolveRead(noExprNode, viewer, graph)).toBe(DENY); // fail-closed floor, mirrors engine default-deny
  });
});
