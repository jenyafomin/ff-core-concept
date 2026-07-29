// @ff/rental-balance — P1 payment-by-one-car vertical over @ff/engine.
// Payment/order ingest (RowSource port) → projection → the first honest agent-cycle (balance-observer:
// reads the projection, computes remaining + detects discrepancy, writes an observation back) → owner CLI.
// Spec: docs/_log/2026-07-28-realization-concept-review/BUILD-P1.spec.md

export * from './core/keys.js';
export * from './core/constitution.js';
export * from './core/reduce.js';

export * from './balance.js';
export * from './ingest.js';
export * from './agent/balance-observer.js';
export * from './surface/cli.js';
