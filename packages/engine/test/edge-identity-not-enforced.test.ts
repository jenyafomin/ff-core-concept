/**
 * edge-identity-not-enforced — TRIPWIRE (not a feature test). ADR-0015 reserved the edge-identity SHAPE
 * (types.ts `Edge.id` / `Edge.canonical_id`, ADR-0015 §D1) but deliberately shipped ZERO behavior: no
 * materialization, no id-based dedup, no merge/split/cascade, no canonical_id inheritance. This file records
 * that fact IN CODE, not just in a comment, so it cannot silently drift:
 *
 *   - it asserts `project()` / `foldInto` does NOT stamp `id` onto the projected edges (id stays DERIVED);
 *   - it asserts `foldEdges` dedupes POSITIONALLY by (predicate, target), NOT by `id` — two acts with the
 *     same (predicate, target) fold to ONE edge even though their DERIVED ids are equal, and folding does
 *     not consult `id` at all.
 *
 * These are INVERTED tripwires: they assert today's (non-)behaviour and are written to FAIL the moment
 * someone wires edge-id enforcement/materialization (e.g. foldInto stamping `id`, or foldEdges keying on
 * `id`). That failure is the intended signal to come back and update the `types.ts` doc-comment on `Edge.id`
 * and ADR-0015 to describe the new, real behaviour instead of deleting the warning.
 */
import { describe, it, expect } from 'vitest';
import { project, foldEdges, edgeIdOf, type Act, type Edge } from '../src/index.js';

describe('TRIPWIRE — edge identity is reserved-form only; nothing materializes or enforces it (yet)', () => {
  it('1 — project() does NOT stamp `id` onto projected edges (id stays derived, not materialized)', () => {
    const act: Act = {
      id: 'act:1',
      actor: 'sync:test',
      provenance: { source_ref: 'day:2026-08-21:проект-сайт-женя', snapshotHash: 'h1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'involves', target: 'person:Женя', provenance: 'day-graph:2026-08-21' }],
      payload: { type: 'day' },
    };
    const node = project([act]).get('day:2026-08-21:проект-сайт-женя')!;
    // If this ever flips (foldInto starts stamping id), materialization has landed — go update types.ts + ADR-0015.
    expect(node.edges![0]).not.toHaveProperty('id');
    expect(node.edges![0]).not.toHaveProperty('canonical_id');
  });

  it('2 — foldEdges dedupes POSITIONALLY by (predicate,target), NOT by id', () => {
    const a: Edge = { predicate: 'drives', target: 'car:X', validFrom: '2026-01-01' };
    // Same (predicate,target) as `a` → foldEdges refreshes in place (length stays 1), regardless of any
    // id. Their DERIVED ids are in fact EQUAL (key excludes time) — but that equality is NOT what foldEdges
    // consults; it matches structurally by (predicate,target).
    const b: Edge = { predicate: 'drives', target: 'car:X', validFrom: '2026-09-01' };
    const folded = foldEdges([a], [b], { drives: 'many' });
    expect(folded).toHaveLength(1); // dedup by (predicate,target), not by id
    // Confirm the fold is id-agnostic: the surviving edge carries NO id even though one is derivable.
    expect(folded[0]).not.toHaveProperty('id');
    expect(edgeIdOf('person:masha', a)).toBe(edgeIdOf('person:masha', b)); // derived ids equal (sanity)
  });

  it('3 — foldEdges does not use id to distinguish two DIFFERENT-target edges either (still positional)', () => {
    const a: Edge = { predicate: 'drives', target: 'car:X' };
    const b: Edge = { predicate: 'drives', target: 'car:Y' };
    const folded = foldEdges([a], [b], { drives: 'many' });
    // Two distinct targets accumulate by position — again id plays no role in the fold.
    expect(folded).toHaveLength(2);
    expect(folded.every((e) => !('id' in e))).toBe(true);
  });
});
