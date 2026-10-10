/**
 * StorePort — engine-INTERNAL port over the persistence substrate (NOT a cross-module seam).
 *
 * Method set: `load() · readNode(id) · writeAct(act) · acts() · rebuild(from)` + return shapes.
 * `acts()` (write-model reader) is an ADDITIVE extension for CQRS — engine-internal, so growing the
 * port is allowed (unlike the frozen cross-module EngineClient seam). EXTENSIBLE: which concrete
 * adapter (memory · md · pg …) and the storage layout.
 *
 * CQRS (ADR-0008): the acts-log is the write-model (system-of-record); the graph is a read-model
 * projection. At M0 storage is in-memory / md; swapping to PG at M4 is an ADDITIVE new adapter,
 * never a core edit. Provenance/version fields are carried from day one so M4 is a real correction
 * point, not a scramble.
 *
 * Migration between adapters goes BELOW the Engine (`adapters/replay.ts`: source journal → target
 * `writeAct`, order + `recordedAt` preserved), never through `Engine.write` (it re-stamps time). The
 * source journal is never modified by a replay; after a migration it is ARCHIVED, not deleted — the raw
 * bytes of bad lines live only there (R-4.4).
 */
import type { Act, EnvelopeNode } from '../core/types.js';

export interface StorePort {
  /** Load the full projection (read-model): the flat node list. */
  load(): EnvelopeNode[];
  /** Read a single node by id from the projection. */
  readNode(id: string): EnvelopeNode | null;
  /**
   * Append an act to the write-model (system-of-record). Returns the recorded act.
   * CONTRACT (ADR-0017 D3, SPEC-brain-data-doors R-4.5): the adapter stores the act VERBATIM — it never
   * changes `recordedAt` (the Engine stamps it before calling; replay/migration passes the original) and
   * never reorders acts (journal order carries meaning: `rev`, "last wins"). Unknown fields are kept.
   */
  writeAct(act: Act): Act;
  /** Read-only view of the append-only journal (the write-model / system-of-record). */
  acts(): readonly Act[];
  /** Rebuild the read-model projection from a source ("journal" = replay acts, "files" = re-scan). */
  rebuild(from: 'journal' | 'files'): EnvelopeNode[];
}
