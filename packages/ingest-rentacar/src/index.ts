// @ff/ingest-rentacar — M1 rentacar ingest adapter over @ff/engine.
// Rows → domain_event acts (ingest-as-acts, ADR-0008) with file-first PII payload-store (ADR-0007/6).
// Spec: docs/03-projects/ga-rentacar/specs/02-ingest-acts.spec.md

export * from './ports/row-source.js';
export * from './ports/payload-store.js';

export * from './core/hash.js';
export * from './core/keys.js';
export * from './core/reduce.js';

export * from './adapters/fixture-row-source.js';
export * from './adapters/sheets-row-source.js';
export * from './adapters/file-payload-store.js';

export * from './ingest.js';
