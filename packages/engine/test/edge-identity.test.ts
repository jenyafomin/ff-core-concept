/**
 * edge-identity — positive form tests for the Reserved-Form edge-identity (ADR-0015 / W2-D4).
 *
 * Proves the PURE derivation `edgeIdOf` / `edgeCanonicalIdOf`:
 *  - deterministic + prefixed (`edge:sha256:v1:`);
 *  - STABLE across a meta/provenance/validFrom refresh (the critic patch: the key excludes time, so it
 *    coincides with `foldEdges`'s (predicate,target) dedup key and a refresh-in-place never loses the edge);
 *  - semantically-distinct triples → distinct ids; identical triples → identical ids;
 *  - `canonical_id ?? id` convention;
 *  - a historical edge from the live journal derives an id with NO migration (boot-compat).
 *
 * Grounding: src/core/edge-identity.ts · ADR-0015 §D1 · predicates.ts:110-131 · second-form-spine.test.ts:54-56.
 */
import { describe, it, expect } from 'vitest';
import { edgeIdOf, edgeCanonicalIdOf, type Edge } from '../src/index.js';

describe('edge-identity — edgeIdOf (derived ADDRESS key, ADR-0015 D1)', () => {
  it('1 — deterministic and carries the frozen scheme prefix', () => {
    const edge: Edge = { predicate: 'involves', target: 'person:Женя' };
    const a = edgeIdOf('day:x', edge);
    const b = edgeIdOf('day:x', edge);
    expect(a).toBe(b);
    expect(a.startsWith('edge:sha256:v1:')).toBe(true);
  });

  it('2 — STABLE across a meta/provenance/validFrom refresh (critic patch: time & payload excluded)', () => {
    const base: Edge = { predicate: 'drives', target: 'car:X' };
    const refreshed: Edge = {
      predicate: 'drives',
      target: 'car:X',
      meta: { a: 2 },
      provenance: 'sync:later',
      validFrom: '2026-02-01',
      validTo: '2026-02-10',
    };
    // Same {source,predicate,target} ⇒ same id, no matter meta/provenance/validFrom — otherwise a
    // foldEdges refresh-in-place (matches by (predicate,target)) would drop an edge with a "valid" id.
    expect(edgeIdOf('person:masha', base)).toBe(edgeIdOf('person:masha', refreshed));
  });

  it('3 — retarget (different target) yields a DIFFERENT id', () => {
    const a = edgeIdOf('subj:1', { predicate: 'owner', target: 'person:A' });
    const b = edgeIdOf('subj:1', { predicate: 'owner', target: 'person:B' });
    expect(a).not.toBe(b);
  });

  it('4 — different source yields a DIFFERENT id', () => {
    const edge: Edge = { predicate: 'involves', target: 'person:Женя' };
    expect(edgeIdOf('day:1', edge)).not.toBe(edgeIdOf('day:2', edge));
  });

  it('5 — validFrom does NOT participate (critic patch): same triple, different validFrom ⇒ SAME id', () => {
    const early: Edge = { predicate: 'drives', target: 'car:X', validFrom: '2026-01-01' };
    const late: Edge = { predicate: 'drives', target: 'car:X', validFrom: '2026-09-01' };
    // Must be equal: the id key coincides with foldEdges' (predicate,target) dedup key.
    expect(edgeIdOf('person:masha', early)).toBe(edgeIdOf('person:masha', late));
  });

  it('6 — different predicate yields a DIFFERENT id', () => {
    const a = edgeIdOf('subj:1', { predicate: 'involves', target: 'person:A' });
    const b = edgeIdOf('subj:1', { predicate: 'organizes', target: 'person:A' });
    expect(a).not.toBe(b);
  });
});

describe('edge-identity — edgeCanonicalIdOf (through-line identity, canonical_id ?? id)', () => {
  it('7 — no canonical_id ⇒ falls back to the derived id', () => {
    const edge: Edge = { predicate: 'involves', target: 'person:Женя' };
    expect(edgeCanonicalIdOf('day:x', edge)).toBe(edgeIdOf('day:x', edge));
  });

  it('8 — explicit canonical_id wins over the derived id', () => {
    const edge: Edge = { predicate: 'involves', target: 'person:Женя', canonical_id: 'edge:manual:1' };
    expect(edgeCanonicalIdOf('day:x', edge)).toBe('edge:manual:1');
  });
});

describe('edge-identity — boot-compat on live journal edges (0 migrations)', () => {
  it('9 — a historical edge (day-graph journal) derives a valid id with no journal rewrite', () => {
    // Literal copy of a real edge from packages/engine/.data/day-graph/journal.jsonl (no `id` field there),
    // under its real owning source_ref — proves the id is derivable over history without migration.
    const historical: Edge = { predicate: 'involves', target: 'person:Женя', provenance: 'day-graph:2026-08-21' };
    const id = edgeIdOf('day:2026-08-21:проект-сайт-женя', historical);
    expect(id.startsWith('edge:sha256:v1:')).toBe(true);
    // No canonical_id on historical edges ⇒ canon == derived id (honest: through-change never journaled).
    expect(edgeCanonicalIdOf('day:2026-08-21:проект-сайт-женя', historical)).toBe(id);
  });

  it('10 — an Edge literal with no id/canonical_id typechecks (additive optionality)', () => {
    const edge: Edge = { predicate: 'involves', target: 'person:Женя' };
    expect(edge.id).toBeUndefined();
    expect(edge.canonical_id).toBeUndefined();
  });
});
