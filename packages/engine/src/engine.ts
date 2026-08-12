/**
 * Engine — the concrete EngineClient (S1). Ties the store (projection), the resolve() PEP, the
 * admission-gate and the view-compiler into the one API consumers bind to.
 *
 * write() is FAIL-CLOSED BY BEHAVIOUR: `admit()` runs and can REFUSE the act BEFORE `store.writeAct`
 * is ever called — an inline-PII act never reaches the append-only journal. `recordedAt` is
 * engine-assigned here (immutable, not caller-supplied) per the frozen act-envelope.
 */
import { admit, admitHome, type ActSchema, type HomeRegistry } from './core/admission.js';
import { idempotencyHash } from './core/idempotency.js';
import { load } from './core/loader.js';
import { isProjectable, sourceRefOf } from './core/projection.js';
import { PermissionPolicy } from './core/resolve.js';
import { compile } from './core/view-compiler.js';
import type { Act, Decision, EnvelopeNode, Graph, SubjectRef, ViewDef } from './core/types.js';
import type { Ack, EngineClient } from './ports/engine-client.js';
import type { StorePort } from './ports/store-port.js';
import type { ViewResult } from './core/view-compiler.js';

/** The Constitution node id — the non-negotiable policy ceiling every resolve() clamps against. */
export const CONSTITUTION_ID = 'policy:constitution';

/**
 * Thrown when the Engine refuses to START (fail-stop, not fail-open). Distinct from RefusalError
 * (which refuses to COMPUTE a lens over an invalid graph): this is a construction-time refusal.
 */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

export class Engine implements EngineClient {
  private graph: Graph;

  constructor(
    private readonly store: StorePort,
    private readonly policy: PermissionPolicy,
    private readonly schemas: ActSchema[] = [],
    /** GAP 3 (c): optional one-home barrier registry. Absent ⇒ barrier OFF (behaviour unchanged). */
    private readonly homeRegistry?: HomeRegistry,
  ) {
    // Fail-closed BY CONSTRUCTION (I-7 hardening): a non-FIXED policy has an UNGATED cost-tree
    // (the NAIVE visibility bypass) — it must never back a production Engine. `mode` is the exact
    // discriminant the view-compiler keys gating on, so this guard makes the ungated path
    // unconstructable as an Engine, not merely discouraged by comment.
    if (policy.mode !== 'FIXED') {
      throw new Error(
        `Engine refuses a non-FIXED policy (mode='${policy.mode}'): its cost-tree is ungated, a visibility bypass (I-7). Production Engines run FIXED only.`,
      );
    }
    this.graph = load(store.load());
    // Fail-STOP, not fail-OPEN: resolve()'s clamps (protected_namespaces / no_read) read their
    // ceiling from `policy:constitution`. If that node is ABSENT the clamps silently default to
    // `[]` and the ceiling vanishes (fail-open). We refuse to start instead, ONCE at load time —
    // NOT on the hot path of every resolve() — so the ceiling can never quietly disappear.
    if (!this.graph.byId.has(CONSTITUTION_ID)) {
      throw new EngineError(
        `missing ${CONSTITUTION_ID} — engine refuses to start (fail-stop, not fail-open): the constitution is the policy ceiling every resolve() clamps against`,
      );
    }
  }

  view(def: ViewDef, viewer: SubjectRef): ViewResult {
    return compile(def)(this.graph, { viewer, policy: this.policy });
  }

  resolve(key: string, viewer: SubjectRef, node: EnvelopeNode): Decision {
    return this.policy.resolve(key, viewer, node, this.graph);
  }

  write(act: Act): Ack {
    // engine-assigned, immutable recordedAt (frozen envelope): ignore any caller-supplied value.
    let finalized: Act = { ...act, recordedAt: new Date().toISOString() };
    const verdict = admit(finalized, this.schemas.find((s) => s.actKind === finalized.actKind));
    if (!verdict.ok) return { ok: false, reason: verdict.reason }; // REFUSE before any journal write

    // GAP 3 (c): one-home barrier — a factKind has one writer-home domain. A foreign-domain claim on a
    // homed factKind is refused BEFORE any journal write, even when its source_ref evades the ref-dedup.
    const homeVerdict = admitHome(finalized, this.homeRegistry);
    if (!homeVerdict.ok) return { ok: false, reason: homeVerdict.reason };

    // ── WRITE-SIDE PEP · trust plane (Stage-1, force-bind) ───────────────────────────────────────
    // The read plane routes every read through resolve() (view-compiler); the write plane must not be
    // ungated (T-write-pep-unwired). ONLY a projectable domain_event folds into a graph node (its
    // source_ref) — so it is the ONLY act that can touch canonical / control-plane state (policy:* ,
    // meta:cap/core:* , grant:*). Non-projectable acts (observation/agent_trace/…) ride the log as a
    // side-journal, never mutate canonical truth, and carry no control-plane authority obligation → not
    // gated here (balance-observer's observations still pass, behaviour unchanged).
    //
    // FORCE-BIND (owner-ratified FORK-U3): the writer principal the engine gates against is
    // `finalized.actor` — treated as DATA (who claims to write), NEVER as the BASIS of authority. Authority
    // is resolved ONLY from provenance-checked grants in the graph. In particular a grant's `minted_by` is
    // STAMPED by the engine to the writer (below), so the act BODY can no longer self-declare `system`.
    // NOTE (open fork, NOT closed by force-bind): `actor` is still self-declared under the frozen write(act)
    // port — an actor that impersonates a *privileged* principal is the T-actor-delegation fork, which needs
    // an authenticated principal source (ViewerResolver seam / port change). Out of Stage-1 scope; flagged.
    if (isProjectable(finalized)) {
      const targetId = sourceRefOf(finalized) as string;
      const payload = (finalized.payload ?? {}) as Record<string, unknown>;
      const isGrantWrite = payload.type === 'grant' || targetId.startsWith('grant:');

      // F1 force-bind: the minter of a projected grant is the WRITER the engine sees — not a self-declared
      // body string. A projected grant therefore can never carry an attacker-chosen `minted_by:'system'`.
      if (isGrantWrite) {
        finalized = { ...finalized, payload: { ...payload, minted_by: finalized.actor } };
      }

      // F2/F3 namespace ceiling: a write into a protected family (policy:* , meta:cap/core:* , …) is refused
      // unless the writer holds core:manage-core. This is the INTEGRITY portion of the write PEP; it is a
      // no-op when the Constitution lists no protected_namespaces, so ordinary writes are untouched.
      if (this.policy.canWriteNamespace(finalized.actor, targetId, this.graph) === 'deny') {
        return { ok: false, reason: `write refused: '${targetId}' is a protected namespace (requires core:manage-core)` };
      }

      // F1/F3 mint authority: minting/altering a grant is itself capability-gated (core:manage-grants). A
      // forged self-mint (subject:self, allow:['core:*']) from a holder-less actor is refused here, BEFORE
      // it can reach the projection — so grantValid's read-side trust rests on a gated write boundary.
      if (isGrantWrite) {
        const grantView: EnvelopeNode = { id: targetId, type: 'grant', body: (finalized.payload ?? {}) as Record<string, unknown> };
        if (this.policy.canMintGrant(finalized.actor, grantView, this.graph) === 'deny') {
          return { ok: false, reason: `mint refused: '${finalized.actor}' lacks core:manage-grants to mint grant '${targetId}'` };
        }
      }
    }

    // Idempotency (P1 / R5, ADR-0008 §1 / ingest-spec §4): a re-write of a projectable domain_event whose
    // CONTENT already sits in the log is a NO-OP — the log does not grow, we return the existing entry
    // marked dedup. The discriminant is the KERNEL content-hash (core/idempotency.ts), NOT the caller's
    // `provenance.snapshotHash` label: same projected content ⇒ same hash ⇒ dedup, regardless of act id /
    // recordedAt / snapshotHash. Genuinely CHANGED content (a real supersede) hashes differently, so it
    // appends as a superseding domain_event and the projection takes the freshest. Non-projectable acts
    // (no source_ref, or non-domain_event) never dedup — they always append.
    //
    // SCOPE = the CURRENT (last-in-log) act for this source_ref, NOT any historical act. A superseded act
    // whose content later RECURS is a genuine state transition, not a duplicate: e.g. a `same-as` re-merge
    // re-establishes an edge an intervening un-merge tombstoned — its content matches the ORIGINAL confirm,
    // but that confirm is no longer the node's current state, so re-merge must APPEND, not dedup to no-op.
    // Matching against all history would silently swallow it (the M2 same-as regression). Byte-identical
    // re-syncs (no intervening change → the current act already carries this content) still dedup as before.
    if (isProjectable(finalized)) {
      const ref = sourceRefOf(finalized);
      const key = idempotencyHash(finalized);
      const projectedForRef = this.store.acts().filter((a) => isProjectable(a) && sourceRefOf(a) === ref);
      const current = projectedForRef[projectedForRef.length - 1]; // the freshest act folded into this node
      if (current && idempotencyHash(current) === key) return { ok: true, act: current, dedup: true };
    }

    const recorded = this.store.writeAct(finalized);
    // The graph is a projection of the log (ADR-0008): a domain_event write must surface as its node
    // on the very next read. Refresh from the store (which folded the act into the read-model).
    this.graph = load(this.store.load());
    return { ok: true, act: recorded };
  }

  rebuild(from: 'journal' | 'files'): void {
    this.graph = load(this.store.rebuild(from));
  }
}
