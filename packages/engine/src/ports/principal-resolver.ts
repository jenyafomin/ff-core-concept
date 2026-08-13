/**
 * PrincipalResolver — PAPER-FREEZE ONLY (design-phase, no behavior).
 *
 * Generalizes `ViewerResolver` from the read side to the WRITE side, so read and write share ONE
 * principal-seam: a single authenticated surface identity resolves both the read `viewer` (inherited,
 * unchanged) and the write PRINCIPAL. This freezes the SHAPE of the write-principal seam in the type
 * system only — there is NO implementation, and nothing is wired into `engine.ts` or the write path.
 * See ADR-0010 §③-bis and _shared/topics/03-actor-model/design/01-seam-and-lifecycle.design.md.
 *
 * `AuthenticatedPrincipal` is what a TRUSTED seam owner (a channel/issuer) produces AFTER authenticating
 * a boundary identity. It is the only legitimate source of a raised trust level — encoding **G3** (ADR-0010
 * §③-bis): trust NEVER rises above `unverified` without a real authenticated source. There is no default
 * `system`/`channel` handle; `trust` is set by the resolver from actual authentication, never assumed.
 *
 * `boundaryIdentity` is opaque here on purpose: WHERE the trust boundary actually sits (in-process vs
 * out-of-process/plugin) is the master fork deferred to ADR-0011 (§③-bis G2), and the concrete identity
 * source (Telegram uid, mini-app session, HTTP principal, issuer token) is M5 surface-auth work.
 *
 * TODO(M5 / ADR-0011): implement per-surface authenticated principal resolution once the isolation model
 *   (ADR-0011) fixes where the boundary sits and M5 builds the authenticated identity source.
 */
import type { PrincipalTrust, SubjectRef } from '../core/types.js';
import type { ViewerResolver } from './viewer-resolver.js';

/**
 * What a trusted seam owner produces from an AUTHENTICATED boundary identity. This is the vouched
 * write-principal; the engine may only ever RAISE trust from an object of this kind, never from a
 * self-declared `act.principal` on the body (ADR-0010 §③-bis G3).
 */
export interface AuthenticatedPrincipal {
  /** Resolved "who" — e.g. `user:jenya` / `agent:ff-personal`. */
  subject: SubjectRef;
  /** How strongly the seam owner vouched — `channel` for a trusted channel/handle, `attested` for a verified token. Never defaulted upward (G3). */
  trust: PrincipalTrust;
  /** WHO vouched — the trusting channel/issuer id, e.g. `gateway:agents-manager` | `cli:trusted-operator` | `issuer:<kid>`. Retrofit-impossible audit fact. */
  issuer: string;
  /**
   * G4 (ADR-0011:123-145) — issuer-of-the-issuer: WHO authorized THIS host to be a stamper at
   * all. Distinct from `issuer` (who vouched for THIS principal — attribution of the stamp act);
   * `seamAuthority` answers "under what registration/policy is this host process itself a
   * legitimate seam owner" (authority to stamp, not attribution of a stamp). Conflating the two
   * reproduces the actor≠principal hole ADR-0010 closed, one level up (ADR-0011:137-141).
   * REQUIRED (not optional): `AuthenticatedPrincipal` has zero implementations today (paper-
   * freeze, this file's header) — this is the one moment a required field costs nothing (no
   * implementer to break) and forecloses G4 being silently forgotten later, per ADR-0011's own
   * retrofit-impossibility argument (:134-135). A real resolver MUST derive this from an external
   * anchor it does not itself write (e.g. a capability grant / engine-side host registry) — never
   * self-declare it — but that anchor mechanism is BEHAVIOR, deferred to M5-implementation, not
   * fixed by this form.
   */
  seamAuthority: string;
}

/**
 * The ONE principal seam (read + write). Extends `ViewerResolver` so `resolveViewer` (read side) stays
 * byte-for-byte compatible — the existing paper-freeze is widened, not broken.
 */
export interface PrincipalResolver extends ViewerResolver {
  /**
   * WRITE principal: resolve an authenticated boundary identity to the vouched actor + trust axis + issuer.
   * PAPER-FREEZE: signature only; no implementation at design-phase.
   */
  resolveWritePrincipal(boundaryIdentity: string): AuthenticatedPrincipal;
}
