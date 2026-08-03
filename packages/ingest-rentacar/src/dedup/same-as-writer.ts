/**
 * same-as-writer — the M2 REVERSIBLE merge/un-merge act-builder (spec `04-m2-dedup-and-customer-lens`
 * R2, build-steps `06-m2-build-steps` S3/S4). LIGHT READ-PATH: builds plain `domain_event` acts over the
 * TODAY engine — no kernel edit, no `canonicalId` re-key. `same-as` is already kernel-locked to `many`
 * cardinality (`predicates.ts` `LOCKED_MANY_PREDICATES`), so `foldEdges`'s `many` branch
 * replace-in-place-by-`(predicate,target)` gives merge/un-merge/re-merge "for free" — this module only
 * has to shape the act correctly. The caller (owner-facing confirm UI/script) passes the built `Act` to
 * `engine.write`; this module performs no I/O itself.
 *
 * R-LIGHT-1 (idempotency escape hatch): `Engine.write` dedups a `domain_event` by
 * `source_ref + snapshotHash` (engine.ts). merge/un-merge/re-merge share ONE `source_ref` (the subject
 * node, A), so every toggle MUST hash to something distinct or a re-merge collides byte-for-byte with
 * the original merge and is silently swallowed as a no-op dedup (leaving the projection tombstoned).
 * The caller supplies `seq` — any monotonic discriminator (ISO timestamp, uuid, counter) — and it is
 * folded into the hash alongside the toggle's own fields.
 *
 * R-LIGHT-2 (admission): `admission.ts::scan` refuses inline PII/phone-shaped strings anywhere in
 * `edges[].meta`. This writer puts ONLY enum-ish labels in meta — `status`, `confidence`, `provenance`,
 * `tombstone` — never a raw name/phone/timestamp. Never widen this shape without re-checking admission.
 */
import { createHash } from 'node:crypto';
import type { Act, Edge } from '@ff/engine';

/** Distinct actor for MANUAL dedup acts (an owner decision, not the `sync:ga-rentacar` ingest process). */
export const DEDUP_ACTOR = 'agent:ga-rentacar-dedup';

export type SameAsConfidence = 'high' | 'medium';

export interface SameAsToggleInput {
  /** The subject node's `source_ref` (M2 is light-path: `source_ref`, not `canonicalId` — spec 06 §0/§5). */
  sourceRef: string;
  /** The other node's `source_ref` this edge points at. */
  target: string;
  confidence: SameAsConfidence;
  /** false = merge/re-merge (active edge); true = un-merge (tombstoned in place, not deleted). */
  tombstone: boolean;
  /** R-LIGHT-1: caller-supplied monotonic discriminator — MUST differ between successive toggles on the
   * same (sourceRef, target) so each act gets a distinct snapshotHash. */
  seq: string;
}

function sameAsSnapshotHash(input: Pick<SameAsToggleInput, 'target' | 'confidence' | 'tombstone' | 'seq'>): string {
  const canonical = JSON.stringify({
    predicate: 'same-as',
    target: input.target,
    tombstone: input.tombstone,
    status: 'confirmed',
    confidence: input.confidence,
    seq: input.seq,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Build ONE reversible `same-as` toggle act. Carries no `payload` — the two nodes' own body/type are
 * left untouched (`foldInto`: no payload fields ⇒ prior body/type preserved); only the edge (+ its
 * meta labels) changes. Returns a plain `Act` — the caller is responsible for `engine.write(act)`.
 */
export function buildSameAsAct(input: SameAsToggleInput): Act {
  const snapshotHash = sameAsSnapshotHash(input);
  const edge: Edge = {
    predicate: 'same-as',
    target: input.target,
    // R-LIGHT-2: labels ONLY (no raw PII, no long digit runs) — admission-safe by construction.
    meta: {
      status: 'confirmed',
      confidence: input.confidence,
      provenance: 'manual',
      tombstone: input.tombstone,
    },
  };
  return {
    id: `act:same-as:${input.sourceRef}:${snapshotHash.slice(0, 12)}`,
    actor: DEDUP_ACTOR,
    provenance: { source_ref: input.sourceRef, snapshotHash },
    recordedAt: '', // engine-assigned
    actKind: 'domain_event',
    edges: [edge],
  };
}

/** merge / re-merge (S3, S4): an ACTIVE `same-as` edge (`tombstone: false`). Calling this again with a
 * NEW `seq` after an `unmergeSameAs` toggle IS the re-merge — same builder, replace-in-place resolves it. */
export function confirmSameAs(input: Omit<SameAsToggleInput, 'tombstone'>): Act {
  return buildSameAsAct({ ...input, tombstone: false });
}

/** un-merge (S4): tombstones the SAME edge in place (foldEdges `many`, replace-by-`(predicate,target)`).
 * Not a delete — both nodes and all their facts stay intact (LOSE-NOTHING); the edge is just inactive. */
export function unmergeSameAs(input: Omit<SameAsToggleInput, 'tombstone'>): Act {
  return buildSameAsAct({ ...input, tombstone: true });
}

/** R2.3 read-side predicate: is this edge an ACTIVE, manually-confirmed `same-as` (i.e. cluster/lens
 * eligible)? `candidate` edges never exist in the graph at all (S2 non-projectable), so this only ever
 * needs to filter out tombstoned confirms. */
export function isActiveSameAs(edge: Edge): boolean {
  return edge.predicate === 'same-as' && edge.meta?.status === 'confirmed' && edge.meta?.tombstone !== true;
}
