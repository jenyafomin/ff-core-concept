// @ff/ingest-rentacar — M1 rentacar ingest adapter over @ff/engine.
// Rows → domain_event acts (ingest-as-acts, ADR-0008) with file-first PII payload-store (ADR-0007/6).
// Spec: docs/03-projects/ga-rentacar/specs/02-ingest-acts.spec.md

export * from './ports/row-source.js';
export * from './ports/payload-store.js';

export * from './core/hash.js';
export * from './core/keys.js';
export * from './core/reduce.js';
export * from './predicates.js';

export * from './adapters/fixture-row-source.js';
export * from './adapters/sheets-row-source.js';
export * from './adapters/file-payload-store.js';

export * from './ingest.js';

// ── M2 (specs/04, specs/06) — same-as dedup + customer lens ───────────────────────────────
// candidates.ts owns the SameAsConfidence type; re-export same-as-writer explicitly to avoid a
// duplicate-name ambiguity, and the lens explicitly to avoid re-exporting @ff/engine's Edge.
export * from './dedup/candidates.js';
export {
  DEDUP_ACTOR,
  buildSameAsAct,
  confirmSameAs,
  unmergeSameAs,
  isActiveSameAs,
  type SameAsToggleInput,
} from './dedup/same-as-writer.js';
export {
  customerLens,
  type CustomerLensCar,
  type CustomerLensFine,
  type CustomerLensOrder,
  type CustomerLensResult,
} from './lens/customer-lens.js';

// ── EQ-1 (specs/03) — latest-wins reducer over observation acts (read-side; M3-deferred wiring) ──
export * from './observation/latest-wins.js';
