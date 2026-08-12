// @ff/engine — fixed engine over the node-graph substrate: validate · index · compile · resolve.
// resolve() is the single PEP (I-7). See docs/00-states/00-global-build/realization-plan/phase-1-engine/M0-spec.md

export * from './core/types.js';
export * from './core/loader.js';
export * from './core/edge-index.js';
export * from './core/envelope-validator.js';
export * from './core/resolve.js';
export * from './core/view-compiler.js';
export * from './core/admission.js';
export * from './core/predicates.js';
export * from './core/projection.js';
export * from './core/idempotency.js';
export * from './core/erasure.js';

export * from './ports/store-port.js';
export * from './ports/engine-client.js';
export * from './ports/surface-port.js';
export * from './ports/viewer-resolver.js';
export * from './ports/principal-resolver.js';
export * from './ports/principal-stamper.js';

export * from './adapters/store-memory.js';
export * from './adapters/store-md.js';
export * from './adapters/store-durable-fs.js';

export * from './engine.js';
export * from './runner/durable-runner.js';
