// @ff/brain — the cross-project brain service (ADR-0016, SPEC-brain-v0.6).
// One writer over the @ff/engine journal; scopes are nodes (M:N), the type/predicate registry lives as
// acts in the journal (genesis written once), readers come from the allowlist, never from the request.
//
// Owned by A1. Domain (B2) and read (B3) exports flow through their barrels; the lead wires new
// barrels/service exports here after each wave (SPEC §6).

export * from './contract.js';
export * from './domain/index.js';
export * from './read/index.js';
export * from './service/index.js';
