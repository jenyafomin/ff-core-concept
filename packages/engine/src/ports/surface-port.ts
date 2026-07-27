/**
 * S5 · SurfacePort — PAPER-FREEZE ONLY at M0.
 *
 * The structured render/submit contract for M5 surfaces (mini-app, Cardex, …). The signatures are
 * NAMED and TYPED here to freeze the seam shape, but there is NO implementation at M0. Do NOT
 * conflate this with the engine-internal CLI surface (surface/cli.ts) — different, later contract
 * that merely shares the word "surface" (M0-spec §6 / RECON §10).
 *
 * TODO(M5): implement per-surface render specs + submit wiring behind the viewer-auth gate.
 */
import type { Act, SubjectRef } from '../core/types.js';

/** A declarative render specification for a surface (shape intentionally left open until M5). */
export interface RenderSpec {
  target: string;
  /** Opaque at M0 — the concrete render grammar is an M5 decision, not frozen here. */
  spec: unknown;
}

export interface SurfacePort {
  /** Produce a render spec for `target` as seen by `viewer` (all fields gated by resolve() at M5). */
  getRenderSpec(viewer: SubjectRef, target: string): RenderSpec;
  /** Submit a viewer-authored act from a surface (routes through the admission-gate + resolve()). */
  submit(viewer: SubjectRef, act: Act): void;
}
