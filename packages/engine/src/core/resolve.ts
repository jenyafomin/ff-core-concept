/**
 * resolve() — THE Policy Enforcement Point (PEP). Ported VERBATIM in behaviour from
 * run-capability.mjs (rewritten 2026-07-24 23:29, after the critic pass; NAIVE 3/15 | FIXED 15/15).
 *
 * ONE mechanism for read & write. FIXED:
 *   effective = CLAMP_authority( OVERRIDE_reach( stack ), floor=deny, ceiling=Constitution )
 * `deny` and the Constitution ceiling are CLAMPS applied AFTER the fold, never stack layers (I-8).
 * The combinator/order come from DATA (policy:access-priority), not a hardcoded branch (ADR-0004).
 *
 * The control-plane meta-cap gate (core:manage-access / manage-grants / manage-core) runs on the
 * write path BEFORE the fold (ADR-0004 D4) — this is what closes Hole A (forge-access). The gate is
 * INJECTABLE (see MetaGates) so a test can stub it and prove it is load-bearing, not dead code.
 */
import {
  ALLOW,
  DENY,
  type Decision,
  type EnvelopeNode,
  type Graph,
  type IPermissionPolicy,
  type PolicyMode,
  type SubjectRef,
} from './types.js';

const NAIVE: PolicyMode = 'NAIVE';
const FIXED: PolicyMode = 'FIXED';

// ── glob/prefix matching — engine-fixed grammar over the namespace ───────────────────────────
export function capMatch(pattern: string, cap: string): boolean {
  if (pattern === cap) return true;
  if (pattern.endsWith('*')) return cap.startsWith(pattern.slice(0, -1));
  return false;
}
function subjMatch(pattern: string, subj: string): boolean {
  return capMatch(pattern, subj);
}

function inAllowlist(list: string[] | undefined, viewer: SubjectRef): boolean {
  return (list ?? []).some((p) => subjMatch(p, viewer));
}

// ── scope containment: a project grant covers spaces bound to it ─────────────────────────────
function scopeCovers(graph: Graph, inScope: string, scope: string): boolean {
  if (inScope === scope || inScope === '*') return true;
  const s = graph.byId.get(scope);
  if (s && s.type === 'space') {
    const binds = (s.edges ?? []).find((e) => e.predicate === 'binds-to');
    if (binds && binds.target === inScope) return true;
  }
  return false;
}

function spaceOf(graph: Graph, node: EnvelopeNode): EnvelopeNode | null {
  const sid =
    (node.body?.space as string | undefined) ??
    (node.edges ?? []).find((e) => e.predicate === 'occurs-in')?.target;
  return sid ? graph.byId.get(sid) ?? null : null;
}

function projectOf(node: EnvelopeNode): string {
  return (node.body?.tenant as string | undefined) ?? 'project:ff';
}

/**
 * Meta-cap gates on the CONTROL PLANE. INJECTABLE so the mutation-guard test can stub one and prove
 * the gate is actually invoked on the write path (Hole A: "not dead code").
 */
export interface MetaGates {
  canWriteAccessFields(policy: PermissionPolicy, viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision;
  canMintGrant(policy: PermissionPolicy, minter: SubjectRef, grant: EnvelopeNode, graph: Graph): Decision;
  canWriteNamespace(policy: PermissionPolicy, viewer: SubjectRef, targetId: string, graph: Graph): Decision;
  canMintCapability(policy: PermissionPolicy, minter: SubjectRef, capName: string, graph: Graph): Decision;
}

export const DEFAULT_META_GATES: MetaGates = {
  canWriteAccessFields(policy, viewer, node, graph) {
    if (policy.mode === NAIVE) return policy.resolveWrite(viewer, node, graph, {}); // only needs write-knowledge
    return policy.holdsCapability(viewer, 'core:manage-access', projectOf(node), graph) ? ALLOW : DENY;
  },
  canMintGrant(policy, minter, grant, graph) {
    if (policy.mode === NAIVE) return ALLOW; // ungated — anyone with write mints
    return policy.holdsCapability(minter, 'core:manage-grants', grant.body?.in_scope as string, graph)
      ? ALLOW
      : DENY;
  },
  canWriteNamespace(policy, viewer, targetId, graph) {
    if (policy.mode === NAIVE) return ALLOW; // no namespace protection
    const constitution = graph.byId.get('policy:constitution');
    const protectedNs = ((constitution?.body?.protected_namespaces as string[] | undefined) ?? []).some((ns) =>
      targetId.startsWith(ns),
    );
    if (!protectedNs) return ALLOW;
    return policy.holdsCapability(viewer, 'core:manage-core', 'project:ff', graph) ? ALLOW : DENY;
  },
  canMintCapability(policy, minter, capName, graph) {
    if (policy.mode === NAIVE) return ALLOW; // frictionless minting
    const core = capName.startsWith('core:');
    const needed = core ? 'core:manage-core' : 'core:manage-grants'; // even vendor caps need a review authority
    return policy.holdsCapability(minter, needed, 'project:ff', graph) ? ALLOW : DENY;
  },
};

interface WriteStackEntry {
  layer: string;
  authority: string;
  value: Decision | null;
}

export class PermissionPolicy implements IPermissionPolicy {
  constructor(
    public readonly mode: PolicyMode,
    private readonly metaGates: MetaGates = DEFAULT_META_GATES,
  ) {}

  /** FROZEN PEP entry point. `key`: "read" | "write" | "write:<field>". */
  resolve(key: string, viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision {
    const colon = key.indexOf(':');
    const op = colon === -1 ? key : key.slice(0, colon);
    const field = colon === -1 ? undefined : key.slice(colon + 1);
    if (op === 'write') return this.resolveWrite(viewer, node, graph, { field });
    return this.resolveRead(viewer, node, graph);
  }

  // ── grant validity (meta-cap gate on MINTING — fixes escalation hole 2) ────────────────────
  private granterHasManageGrants(graph: Graph, minter: string, scope: string): boolean {
    return graph.nodes.some(
      (g) =>
        g.type === 'grant' &&
        g.body?.minted_by === 'system' &&
        subjMatch(g.body?.subject as string, minter) &&
        scopeCovers(graph, g.body?.in_scope as string, scope) &&
        ((g.body?.allow as string[] | undefined) ?? []).some((p) => capMatch(p, 'core:manage-grants')),
    );
  }

  private grantValid(graph: Graph, g: EnvelopeNode): boolean {
    if (this.mode === NAIVE) return true; // NAIVE: anyone with write can mint — no gate
    const minter = g.body?.minted_by as string;
    if (minter === 'system' || minter === 'engine') return true;
    return this.granterHasManageGrants(graph, minter, g.body?.in_scope as string);
  }

  /** resolve grants for (viewer, cap, scope). Within/cross-grant fold is data-driven. */
  holdsCapability(viewer: SubjectRef, cap: string, scope: string, graph: Graph): boolean {
    const grants = graph.nodes.filter(
      (g) =>
        g.type === 'grant' &&
        subjMatch(g.body?.subject as string, viewer) &&
        scopeCovers(graph, g.body?.in_scope as string, scope) &&
        this.grantValid(graph, g),
    );
    let allow = false;
    let deny = false;
    for (const g of grants) {
      if (((g.body?.allow as string[] | undefined) ?? []).some((p) => capMatch(p, cap))) allow = true;
      if (((g.body?.deny as string[] | undefined) ?? []).some((p) => capMatch(p, cap))) deny = true;
    }
    const capNode = graph.byId.get('meta:cap/' + cap);
    if (this.mode === FIXED) {
      // deny-wins (VETO within/across grants) → default-deny FLOOR. Module's default:allow is IGNORED.
      if (deny) return false;
      if (allow) return true;
      return false; // engine floor: default-deny, non-negotiable
    }
    // NAIVE: allow-wins (deny not consulted first); module-authored default:allow honored.
    if (allow) return true;
    if (deny) return false;
    return capNode?.body?.default === 'allow'; // opt-out default-deny bypass
  }

  private writeStack(viewer: SubjectRef, node: EnvelopeNode, graph: Graph): WriteStackEntry[] {
    const stack: WriteStackEntry[] = [];
    stack.push({
      layer: 'node',
      authority: 'node',
      value: inAllowlist(node.access?.can_write, viewer) ? ALLOW : null,
    });
    const space = spaceOf(graph, node);
    if (space) {
      const overrides = space.body?.policy_overrides as
        | Record<string, { write?: Decision; authority?: string }>
        | undefined;
      const ov = overrides?.[viewer];
      if (ov && ov.write) stack.push({ layer: 'space.override', authority: ov.authority ?? 'admin', value: ov.write });
      const def = (space.body?.policy_default as { write?: Decision } | undefined)?.write;
      if (def) stack.push({ layer: 'space.default', authority: 'space', value: def });
    }
    return stack;
  }

  resolveWrite(
    viewer: SubjectRef,
    node: EnvelopeNode,
    graph: Graph,
    opts: { field?: string } = {},
  ): Decision {
    const field = opts.field;
    // ── control-plane FIELD gate (wired INTO the write path, not decorative): writing
    //    access/visibility fields is ITSELF capability-gated in FIXED (closes Hole A). ──
    const isControlField = !!field && (field.startsWith('access') || field.startsWith('visibility'));
    if (isControlField && this.mode === FIXED && this.metaGates.canWriteAccessFields(this, viewer, node, graph) === DENY) {
      return DENY;
    }

    const stack = this.writeStack(viewer, node, graph);
    if (this.mode === NAIVE) {
      // node at TOP; first non-null wins; deny is merely the implicit bottom layer.
      for (const s of stack) if (s.value) return s.value; // node ALLOW outranks admin space.override DENY
      return DENY;
    }
    // FIXED: OVERRIDE-fold the reach; authority DENIES are clamps (skipped), authority ALLOWS participate.
    let reach: Decision | null = null;
    for (const s of stack) {
      if (s.value === DENY && (s.authority === 'admin' || s.authority === 'constitution')) continue; // clamp, skip
      if (s.value) {
        reach = s.value;
        break;
      }
    }
    // CLAMP (order-independent, applied AFTER the fold):
    const constitution = graph.byId.get('policy:constitution');
    const adminDeny = stack.some((s) => s.authority === 'admin' && s.value === DENY);
    const constDeny = ((constitution?.body?.protected_namespaces as string[] | undefined) ?? []).some((ns) =>
      node.id.startsWith(ns),
    );
    if (constDeny) return DENY; // Constitution ceiling
    if (adminDeny) return DENY; // authority VETO clamp (deny direction)
    return reach ?? DENY; // default-deny floor (admin ALLOW reaches here honored)
  }

  resolveRead(viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision {
    const reach = inAllowlist(node.visibility?.readable_by, viewer) || inAllowlist(node.access?.can_read, viewer);
    if (this.mode === NAIVE) return reach ? ALLOW : DENY; // flat allowlist, no clamps
    const constitution = graph.byId.get('policy:constitution');
    if (((constitution?.body?.no_read as string[] | undefined) ?? []).includes(node.id)) return DENY; // ceiling
    const tenant = node.body?.tenant as string | undefined; // tenant isolation clamp (S8)
    if (tenant && !this.holdsCapability(viewer, 'core:read', tenant, graph)) return DENY;
    return reach ? ALLOW : DENY;
  }

  // ── control-plane gate wrappers (delegate to the injectable MetaGates) ──────────────────────
  canWriteAccessFields(viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision {
    return this.metaGates.canWriteAccessFields(this, viewer, node, graph);
  }
  canMintGrant(minter: SubjectRef, grant: EnvelopeNode, graph: Graph): Decision {
    return this.metaGates.canMintGrant(this, minter, grant, graph);
  }
  canWriteNamespace(viewer: SubjectRef, targetId: string, graph: Graph): Decision {
    return this.metaGates.canWriteNamespace(this, viewer, targetId, graph);
  }
  canMintCapability(minter: SubjectRef, capName: string, graph: Graph): Decision {
    return this.metaGates.canMintCapability(this, minter, capName, graph);
  }

  // ── consent valve — FIXED cross-checks the capability's irreversible flag, not a self-declared string ──
  valveGate(action: EnvelopeNode, graph: Graph): Decision {
    const capNode = graph.byId.get(action.body?.capability as string);
    const irreversible = capNode?.body?.irreversible === true;
    if (this.mode === NAIVE) return action.visibility?.valve === 'none' ? ALLOW : DENY; // trusts spoofable label
    if (!irreversible) return ALLOW;
    return action.body?.consent_event ? ALLOW : DENY; // must have real consent
  }

  // ── delegation-chain capability (S9): NAIVE inherits parent grant; FIXED uses sub's own narrowed grant ──
  delegatedCapability(sub: SubjectRef, cap: string, parent: SubjectRef, scope: string, graph: Graph): boolean {
    if (this.mode === NAIVE) return this.holdsCapability(parent, cap, scope, graph); // confused deputy
    return this.holdsCapability(sub, cap, scope, graph); // narrowed: sub needs its own grant
  }
}

/**
 * The production policy: FIXED (default meta-gates). This is the ONLY ready-made policy the package
 * public entry ships. The NAIVE baseline (the boundary-doc-as-written resolver, whose cost-tree is
 * ungated) lives in `src/testing/policies.ts` and is NOT re-exported from index — so a production
 * caller cannot reach the ungated visibility path through the public API. Engine's constructor
 * additionally REJECTS any non-FIXED policy (fail-closed by construction) — see engine.ts.
 */
export const FIXED_POLICY = new PermissionPolicy(FIXED);
