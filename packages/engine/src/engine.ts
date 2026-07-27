/**
 * Engine — the concrete EngineClient (S1). Ties the store (projection), the resolve() PEP, the
 * admission-gate and the view-compiler into the one API consumers bind to.
 *
 * write() is FAIL-CLOSED BY BEHAVIOUR: `admit()` runs and can REFUSE the act BEFORE `store.writeAct`
 * is ever called — an inline-PII act never reaches the append-only journal. `recordedAt` is
 * engine-assigned here (immutable, not caller-supplied) per the frozen act-envelope.
 */
import { admit, type ActSchema } from './core/admission.js';
import { load } from './core/loader.js';
import { PermissionPolicy } from './core/resolve.js';
import { compile } from './core/view-compiler.js';
import type { Act, Decision, EnvelopeNode, Graph, SubjectRef, ViewDef } from './core/types.js';
import type { Ack, EngineClient } from './ports/engine-client.js';
import type { StorePort } from './ports/store-port.js';
import type { ViewResult } from './core/view-compiler.js';

export class Engine implements EngineClient {
  private graph: Graph;

  constructor(
    private readonly store: StorePort,
    private readonly policy: PermissionPolicy,
    private readonly schemas: ActSchema[] = [],
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
  }

  view(def: ViewDef, viewer: SubjectRef): ViewResult {
    return compile(def)(this.graph, { viewer, policy: this.policy });
  }

  resolve(key: string, viewer: SubjectRef, node: EnvelopeNode): Decision {
    return this.policy.resolve(key, viewer, node, this.graph);
  }

  write(act: Act): Ack {
    // engine-assigned, immutable recordedAt (frozen envelope): ignore any caller-supplied value.
    const finalized: Act = { ...act, recordedAt: new Date().toISOString() };
    const verdict = admit(finalized, this.schemas.find((s) => s.actKind === finalized.actKind));
    if (!verdict.ok) return { ok: false, reason: verdict.reason }; // REFUSE before any journal write
    const recorded = this.store.writeAct(finalized);
    return { ok: true, act: recorded };
  }

  rebuild(from: 'journal' | 'files'): void {
    this.graph = load(this.store.rebuild(from));
  }
}
