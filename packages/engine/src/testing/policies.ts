/**
 * TEST-INTERNAL policies. This module is deliberately NOT re-exported from the package entry
 * (`src/index.ts`) — it holds the NAIVE baseline resolver, whose cost-tree is UNGATED (the
 * boundary-doc-as-written composition bug). It exists ONLY so the capability test can drive the
 * `NAIVE 3/15` baseline and the Hole A/B red cases.
 *
 * Production code cannot reach NAIVE through the public API (it is not exported from index), and
 * even a caller who constructs `new PermissionPolicy('NAIVE')` cannot back an `Engine` with it —
 * the Engine constructor fail-closed-rejects any non-FIXED policy (engine.ts). So the ungated
 * visibility path is unreachable as a production Engine BY CONSTRUCTION.
 */
import { DEFAULT_META_GATES, PermissionPolicy } from '../core/resolve.js';
import { ALLOW } from '../core/types.js';

/** The NAIVE baseline (attacks breach; used only to prove the FIXED fix is load-bearing). */
export const NAIVE_POLICY = new PermissionPolicy('NAIVE');

/** A FIXED policy whose meta-cap gate is stubbed always-allow (mutation-guard for Hole A). */
export function fixedPolicyWithStubbedAccessGate(): PermissionPolicy {
  return new PermissionPolicy('FIXED', {
    ...DEFAULT_META_GATES,
    canWriteAccessFields: () => ALLOW, // stub: pretend the meta-cap gate always passes
  });
}
