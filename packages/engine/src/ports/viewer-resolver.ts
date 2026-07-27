/**
 * S6 · ViewerResolver — PAPER-FREEZE ONLY at M0.
 *
 * Maps a surface identity (Telegram user, mini-app session, HTTP principal, …) to an engine
 * SubjectRef (the `viewer` every resolve() call takes). Signature is named/typed to freeze the
 * seam; no implementation at M0.
 *
 * TODO(M5): implement per-surface identity resolution (Telegram uid → user:… / agent:…).
 */
import type { SubjectRef } from '../core/types.js';

export interface ViewerResolver {
  /** Resolve an opaque per-surface identity to the engine's canonical viewer subject. */
  resolveViewer(surfaceIdentity: string): SubjectRef;
}
