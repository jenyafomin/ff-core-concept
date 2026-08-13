/**
 * PrincipalStamper — PAPER-FREEZE ONLY (design-phase, no behavior).
 *
 * The write-side binding seam: given an INCOMING `Act` and the `AuthenticatedPrincipal` a trusted seam
 * owner resolved, it produces the act that will actually be journaled — or REFUSES it. This freezes the
 * SHAPE only; there is NO implementation, and nothing is wired into `engine.ts` or the frozen
 * `write(act): Ack` path. See ADR-0010 §③-bis and
 * _shared/topics/03-actor-model/design/01-seam-and-lifecycle.design.md.
 *
 * The result is an `Ack`-style discriminated union: either a stamped `Act` or a REFUSAL. It encodes the
 * two ADR-0010 §③-bis guardrails:
 *
 *   G1 — enforcement REFUSES a principal mismatch; it NEVER silently rewrites `Act.actor`.
 *     • The incoming `act.principal` is DROPPED, never merged (drop-and-re-stamp) — a caller must not
 *       smuggle a `channel`/`attested` marker in the body.
 *     • A claimed `act.actor` that MISMATCHES the authenticated principal's subject is REFUSED
 *       (`{ ok: false }`), NOT quietly rewritten. A silent rewrite hides a forge attempt and breaks
 *       attribution/monument (Закон ②, Ц2 Тождество), so the stamper must surface the conflict.
 *     • On success the stamper writes ONLY `principal.*`; `Act.actor` is never silently clobbered.
 *
 *   G3 — trust NEVER rises by default: the trust axis in the re-stamped `principal.*` comes SOLELY from
 *     the `AuthenticatedPrincipal` a real authenticated source produced. There is no default
 *     `system`/`channel` handle; an unstamped/unauthenticated path stays `unverified`.
 *
 * TODO(M5 / ADR-0011): implement drop-and-re-stamp + mismatch-refusal once the isolation model
 *   (ADR-0011) fixes the trust boundary and M5 builds the authenticated principal source. The engine-side
 *   enforcement flip (reading the re-stamped authority axis) is a separate owner nod (ADR-0010 Decision ③).
 */
import type { Act } from '../core/types.js';
import type { AuthenticatedPrincipal } from './principal-resolver.js';

/**
 * `Ack`-style result of a stamp attempt (paper-freeze): either the act to journal (with `principal.*`
 * re-stamped and `actor` intact) or a REFUSAL with a reason. Mirrors `Ack` deliberately — a refusal is a
 * `write` refusal in waiting.
 */
export type PrincipalStampResult =
  | { ok: true; act: Act }
  | { ok: false; reason: string };

export interface PrincipalStamper {
  /**
   * Drop any caller-supplied `incoming.principal`, then re-stamp `principal.*` from the AUTHENTICATED
   * principal. If `incoming.actor` mismatches `principal.subject`, REFUSE (G1) — do not rewrite `actor`.
   *
   * G4 (ADR-0011:123-145): on success, the re-stamped `principal.*` MUST carry `seamAuthority` copied
   * verbatim from the `AuthenticatedPrincipal` argument — the stamper does not invent, default, or omit
   * it; a resolver that cannot supply `seamAuthority` cannot legitimately call `stamp()` at all, by
   * construction of `AuthenticatedPrincipal.seamAuthority` being REQUIRED (principal-resolver.ts). This
   * only RESERVES the slot (P-3); naming the out-of-band trust root that makes `seamAuthority`
   * non-self-declared (who vouches for the stamper) is a SEPARATE later decision (BEHAVIOR, M5-impl).
   * PAPER-FREEZE: signature only; no implementation at design-phase.
   */
  stamp(incoming: Act, principal: AuthenticatedPrincipal): PrincipalStampResult;
}
