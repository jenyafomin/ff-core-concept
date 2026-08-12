/**
 * trust-plane.test — the write-side Policy Enforcement Point (Stage-1 force-bind).
 *
 * Closes the three verified trust bugs (docs/council/raw/2026-08-11-next-step-strategy/
 * PREMISE-CHECK-trust-bugs.analysis.md):
 *   F3 · T-write-pep-unwired      — Engine.write() never consulted write-authority.
 *   F1 · T-grant-forgery          — a self-minted grant (minted_by:'system', allow:['core:*']) was trusted.
 *   F2 · T-policy-node-provenance — the Constitution / meta-caps could be overwritten via write().
 *
 * The premise-check's three exploit paths are exercised here as an actor (`user:mallory`) who holds only
 * `core:write-knowledge` — she must be REFUSED before the journal, while a privileged holder passes.
 *
 * Design note (disclosed scope): the write PEP wired here is the INTEGRITY ceiling (canWriteNamespace +
 * canMintGrant), NOT the full allowlist-fold of resolveWrite. The full fold's default-deny floor would
 * deny every ordinary create (an unresolved "what authorizes an ordinary write" contract), so ordinary
 * writes to non-protected namespaces still pass (regression test at the end). Trust/identity/truth/consent
 * live entirely in the protected control-plane namespaces — which are the ones this gate seals.
 */
import { describe, it, expect } from 'vitest';
import { Engine, MemoryStore, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js';

// ── seed helpers ─────────────────────────────────────────────────────────────────────────────
function constitution(extra: Record<string, unknown> = {}): EnvelopeNode {
  return {
    id: 'policy:constitution',
    type: 'policy',
    state: { status: 'active' },
    edges: [],
    view: [],
    visibility: { readable_by: ['agent:*'] },
    access: { can_read: ['agent:*'], can_write: [] },
    acts: [],
    policy_ref: [],
    body: {
      synthetic: true,
      no_read_ids: [],
      protected_namespaces: ['policy:', 'meta:cap/core:'],
      default: 'deny',
      ...extra,
    },
  };
}

function grant(id: string, subject: string, allow: string[]): EnvelopeNode {
  return {
    id,
    type: 'grant',
    state: {},
    edges: [],
    view: [],
    visibility: { readable_by: ['agent:*'] },
    access: { can_read: ['agent:*'], can_write: [] },
    acts: [],
    policy_ref: [],
    body: { synthetic: true, subject, in_scope: 'project:ff', allow, deny: [], minted_by: 'system' },
  };
}

/** A projectable domain_event: the ONLY act-kind that folds into a graph node (its source_ref). */
function domainEvent(id: string, actor: string, source_ref: string, payload: Record<string, unknown>): Act {
  return {
    id,
    actor,
    provenance: { source_ref, snapshotHash: id },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

// substrate: constitution + a privileged admin (manage-core + manage-grants) + a limited writer (mallory).
function seed(): EnvelopeNode[] {
  return [
    constitution(),
    grant('grant:admin', 'user:admin', ['core:manage-core', 'core:manage-grants']),
    grant('grant:mallory', 'user:mallory', ['core:write-knowledge']),
  ];
}

function engineOf() {
  const store = new MemoryStore(seed());
  const engine = new Engine(store, FIXED_POLICY);
  return { store, engine };
}

// ── F2 · policy-node overwrite ─────────────────────────────────────────────────────────────────
describe('F2 · T-policy-node-provenance — the Constitution cannot be overwritten without core:manage-core', () => {
  it('EXPLOIT REFUSED: mallory rewriting policy:constitution (default:allow, empty protected list) is denied before the journal', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(
      domainEvent('atk-policy', 'user:mallory', 'policy:constitution', {
        type: 'policy',
        protected_namespaces: [],
        default: 'allow',
      }),
    );
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toMatch(/protected namespace|manage-core/i);
    expect(store.acts()).toHaveLength(0); // refuse-before-journal: the forge never landed
  });

  it('EXPLOIT REFUSED: mallory writing an un-enumerated meta:cap/core:* node (prefix ceiling) is denied', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(
      domainEvent('atk-cap', 'user:mallory', 'meta:cap/core:brand-new', { type: 'capability', name: 'core:brand-new' }),
    );
    expect(ack.ok).toBe(false);
    expect(store.acts()).toHaveLength(0);
  });

  it('CONTROL: a core:manage-core holder (admin) MAY write a policy node', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(domainEvent('ok-policy', 'user:admin', 'policy:house-rule', { type: 'policy', rule: 'x' }));
    expect(ack.ok).toBe(true);
    expect(store.acts()).toHaveLength(1);
  });
});

// ── F1 · grant forgery ───────────────────────────────────────────────────────────────────────
describe('F1 · T-grant-forgery — a self-minted grant is refused, and a minted grant is provenance-bound', () => {
  it('EXPLOIT REFUSED: mallory minting herself a grant allow:[core:*], minted_by:system, is denied before the journal', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(
      domainEvent('atk-grant', 'user:mallory', 'grant:mallory-pwn', {
        type: 'grant',
        subject: 'user:mallory',
        in_scope: 'project:ff',
        allow: ['core:*'],
        minted_by: 'system', // the forged bearer string — must NOT buy authority
      }),
    );
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toMatch(/mint refused|manage-grants/i);
    expect(store.acts()).toHaveLength(0);
  });

  it('and the forge bought NO capability: mallory still does not hold core:manage-core', () => {
    const { store, engine } = engineOf();
    engine.write(
      domainEvent('atk-grant2', 'user:mallory', 'grant:mallory-pwn', {
        type: 'grant', subject: 'user:mallory', in_scope: 'project:ff', allow: ['core:*'], minted_by: 'system',
      }),
    );
    const graph = { nodes: store.load(), byId: new Map(store.load().map((n) => [n.id, n])) };
    expect(FIXED_POLICY.holdsCapability('user:mallory', 'core:manage-core', 'project:ff', graph)).toBe(false);
  });

  it('CONTROL + FORCE-BIND: admin (core:manage-grants) mints a grant, and the engine stamps minted_by = the writer (not the self-declared string)', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(
      domainEvent('ok-grant', 'user:admin', 'grant:new-writer', {
        type: 'grant',
        subject: 'agent:x',
        in_scope: 'project:ff',
        allow: ['core:write-knowledge'],
        minted_by: 'system', // caller-declared — the engine OVERRIDES it with the real writer
      }),
    );
    expect(ack.ok).toBe(true);
    const minted = store.load().find((n) => n.id === 'grant:new-writer')!;
    expect(minted.body?.minted_by).toBe('user:admin'); // force-bound to the writer, self-declared 'system' ignored
  });
});

// ── F3 · self-declared actor is DATA, not authority ────────────────────────────────────────────
describe('F3 · T-write-pep-unwired — the write PEP is on the hot path; a self-declared actor grants no authority', () => {
  it('a body that self-declares authority does not help: the SUBJECT (actor) is what the ceiling gates, and mallory lacks the cap', () => {
    const { store, engine } = engineOf();
    // even carrying access.can_write for herself in the projection cannot happen — projection wipes access;
    // the only authority is the graph's grants, resolved against the writer principal.
    const ack = engine.write(
      domainEvent('atk-self', 'user:mallory', 'policy:constitution', { type: 'policy', default: 'allow', minted_by: 'system' }),
    );
    expect(ack.ok).toBe(false);
    expect(store.acts()).toHaveLength(0);
  });

  it('REGRESSION: an ordinary write to a NON-protected namespace still passes (the gate seals only the control plane)', () => {
    const { store, engine } = engineOf();
    const ack = engine.write(domainEvent('ok-ordinary', 'user:mallory', 'customer:42', { type: 'customer', note: 'ordinary' }));
    expect(ack.ok).toBe(true);
    expect(store.acts()).toHaveLength(1);
  });

  it('REGRESSION: a non-projectable observation is never control-plane gated (balance-observer path unchanged)', () => {
    const { store, engine } = engineOf();
    const obs: Act = {
      id: 'obs-1', actor: 'agent:observer', provenance: { source_ref: 'customer:42', kind: 'note' },
      recordedAt: '', actKind: 'observation', edges: [], payload: { type: 'note', text: 'ok' },
    };
    expect(engine.write(obs).ok).toBe(true);
    expect(store.acts()).toHaveLength(1);
  });
});
