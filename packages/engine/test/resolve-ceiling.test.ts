import { describe, it, expect } from 'vitest';

import {
  load,
  FIXED_POLICY,
  type Decision,
  type EnvelopeNode,
  type Graph,
} from '../src/index.js';

/**
 * Constitution-ceiling symmetry — fork F-5 (= R8). ADR: variant (c) "two different ceilings".
 * Doc: docs/03-projects/ga-rentacar/_inbox/ADR-DRAFT-resolve-ceiling-symmetry.decision.md
 *
 * TWO ceilings, TWO obligations, deliberately ASYMMETRIC:
 *   • WRITE  = namespace-ceiling (PREFIX), gated by core:manage-core — obligation: INTEGRITY.
 *              a control-plane family (`meta:cap/core:*`) is protected; a NEW node minted under it
 *              is auto-protected without a policy edit. A holder of core:manage-core passes; others deny.
 *   • READ   = per-node-ceiling (EXACT: `no_read_ids`) — obligation: PRIVACY-AS-EXCEPTION.
 *              sealing one node must NOT silently seal its siblings. Optional `no_read_namespaces`
 *              (PREFIX) is reserved for the rare "seal a whole family on read" need.
 *
 * These clamps run AFTER the fold (ADR-0004): a subject the fold would ALLOW is still clamped.
 */

const ALLOW: Decision = 'allow';
const DENY: Decision = 'deny';

// ── minimal envelope helper (same 10-field shape the corpus uses) ─────────────────────────────
function node(id: string, patch: Partial<EnvelopeNode> = {}): EnvelopeNode {
  return {
    id,
    type: 'output',
    state: {},
    edges: [],
    view: [],
    visibility: { level: 'visible-to-ai', valve: 'none', readable_by: [] },
    access: { can_read: [], can_write: [] },
    acts: [],
    policy_ref: [],
    body: { synthetic: true },
    ...patch,
  } as EnvelopeNode;
}

function grant(id: string, subject: string, allow: string[]): EnvelopeNode {
  return node(id, {
    type: 'grant',
    body: { synthetic: true, subject, in_scope: 'project:ff', allow, deny: [], minted_by: 'system' },
  });
}

// ── WRITE ceiling = namespace-ceiling (prefix), gated by core:manage-core ─────────────────────
describe('F-5(c) WRITE ceiling — protected_namespaces is a PREFIX, gated by core:manage-core', () => {
  // subject WITHOUT core:manage-core (holds only ordinary write); subject WITH it.
  const g: Graph = load([
    node('policy:constitution', {
      type: 'policy',
      access: { can_read: ['agent:*'], can_write: [] },
      body: {
        synthetic: true,
        target: '*',
        authority: 'constitution',
        no_read_ids: [],
        no_read_namespaces: [],
        protected_namespaces: ['meta:cap/core:'],
        default: 'deny',
      },
    }),
    grant('grant:writer', 'user:writer', ['core:write-knowledge']),
    grant('grant:admin', 'user:admin', ['core:manage-core']),
    // a BRAND-NEW node under the protected family, enumerated NOWHERE in policy — proves prefix intent.
    node('meta:cap/core:brand-new', {
      type: 'capability',
      access: { can_read: ['agent:*'], can_write: ['user:writer', 'user:admin'] },
      body: { synthetic: true, name: 'core:brand-new' },
    }),
    // a node OUTSIDE the protected family — the ceiling must not touch it.
    node('node:ordinary-doc', {
      access: { can_read: ['agent:*'], can_write: ['user:writer'] },
    }),
  ]);
  const NEW = g.byId.get('meta:cap/core:brand-new')!;
  const ORD = g.byId.get('node:ordinary-doc')!;

  it('non-holder writing a NEW node under meta:cap/core: is DENIED even though node-level can_write lists them', () => {
    expect(FIXED_POLICY.resolveWrite('user:writer', NEW, g)).toBe(DENY);
  });

  it('a core:manage-core HOLDER passes the ceiling and writes the same node (ALLOW)', () => {
    expect(FIXED_POLICY.resolveWrite('user:admin', NEW, g)).toBe(ALLOW);
  });

  it('the ceiling does not touch a node outside the protected namespace (ALLOW)', () => {
    expect(FIXED_POLICY.resolveWrite('user:writer', ORD, g)).toBe(ALLOW);
  });
});

// ── READ ceiling = per-node-ceiling (EXACT) ───────────────────────────────────────────────────
describe('F-5(c) READ ceiling — no_read_ids is EXACT (privacy-as-exception, siblings safe)', () => {
  const constitution = (extra: Record<string, unknown>): EnvelopeNode =>
    node('policy:constitution', {
      type: 'policy',
      access: { can_read: ['agent:*'], can_write: [] },
      body: {
        synthetic: true,
        target: '*',
        authority: 'constitution',
        protected_namespaces: [],
        default: 'deny',
        ...extra,
      },
    });

  const diary = node('node:sealed-diary', {
    visibility: { level: 'no-read', valve: 'none', readable_by: ['user:jenya'] },
    access: { can_read: ['user:jenya'], can_write: [] },
    body: { synthetic: true },
  });
  const sibling = node('node:sealed-diary-2', {
    visibility: { level: 'visible-to-ai', valve: 'none', readable_by: ['user:jenya'] },
    access: { can_read: ['user:jenya'], can_write: [] },
    body: { synthetic: true },
  });

  it('canonical field name: no_read_ids clamps the exact node to DENY even when readable_by = ALLOW', () => {
    const g = load([constitution({ no_read_ids: ['node:sealed-diary'] }), diary, sibling]);
    expect(FIXED_POLICY.resolveRead('user:jenya', g.byId.get('node:sealed-diary')!, g)).toBe(DENY);
  });

  it('a SIBLING (node:sealed-diary-2) is NOT swept up by the exact list — stays readable', () => {
    const g = load([constitution({ no_read_ids: ['node:sealed-diary'] }), diary, sibling]);
    expect(FIXED_POLICY.resolveRead('user:jenya', g.byId.get('node:sealed-diary-2')!, g)).toBe(ALLOW);
  });

  it('reserved no_read_namespaces (PREFIX) can seal a whole family on demand — both siblings DENY', () => {
    const g = load([constitution({ no_read_namespaces: ['node:sealed-'] }), diary, sibling]);
    expect(FIXED_POLICY.resolveRead('user:jenya', g.byId.get('node:sealed-diary')!, g)).toBe(DENY);
    expect(FIXED_POLICY.resolveRead('user:jenya', g.byId.get('node:sealed-diary-2')!, g)).toBe(DENY);
  });
});

// ── regression anchor: the asymmetry is DESIGNED, not a bug ────────────────────────────────────
describe('F-5(c) regression anchor — write=PREFIX, read=EXACT must stay asymmetric', () => {
  it('write treats an un-enumerated family member as protected (prefix) while read does not (exact)', () => {
    const g: Graph = load([
      node('policy:constitution', {
        type: 'policy',
        access: { can_read: ['agent:*'], can_write: [] },
        body: {
          synthetic: true,
          authority: 'constitution',
          protected_namespaces: ['meta:cap/core:'],
          no_read_ids: ['node:sealed-diary'],
          no_read_namespaces: [],
          default: 'deny',
        },
      }),
      grant('grant:writer', 'user:writer', ['core:write-knowledge']),
      node('meta:cap/core:unlisted', {
        type: 'capability',
        access: { can_read: ['agent:*'], can_write: ['user:writer'] },
        body: { synthetic: true, name: 'core:unlisted' },
      }),
      node('node:sealed-diary-2', {
        visibility: { level: 'visible-to-ai', valve: 'none', readable_by: ['user:jenya'] },
        access: { can_read: ['user:jenya'], can_write: [] },
        body: { synthetic: true },
      }),
    ]);
    // WRITE: an un-enumerated member of the protected family IS clamped (prefix) for a non-holder.
    expect(FIXED_POLICY.resolveWrite('user:writer', g.byId.get('meta:cap/core:unlisted')!, g)).toBe(DENY);
    // READ: an un-enumerated sibling of a sealed id is NOT clamped (exact).
    expect(FIXED_POLICY.resolveRead('user:jenya', g.byId.get('node:sealed-diary-2')!, g)).toBe(ALLOW);
  });
});
