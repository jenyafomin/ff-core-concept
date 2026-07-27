/**
 * StorePort — engine-INTERNAL port over the persistence substrate (NOT a cross-module seam).
 *
 * FROZEN method set: `load() · readNode(id) · writeAct(act) · rebuild(from)` + return shapes.
 * EXTENSIBLE: which concrete adapter (memory · md · pg …) and the storage layout.
 *
 * CQRS (ADR-0008): the acts-log is the write-model (system-of-record); the graph is a read-model
 * projection. At M0 storage is in-memory / md; swapping to PG at M4 is an ADDITIVE new adapter,
 * never a core edit. Provenance/version fields are carried from day one so M4 is a real correction
 * point, not a scramble.
 */
import type { Act, EnvelopeNode } from '../core/types.js';

export interface StorePort {
  /** Load the full projection (read-model): the flat node list. */
  load(): EnvelopeNode[];
  /** Read a single node by id from the projection. */
  readNode(id: string): EnvelopeNode | null;
  /** Append an act to the write-model (system-of-record). Returns the recorded act (recordedAt set). */
  writeAct(act: Act): Act;
  /** Rebuild the read-model projection from a source ("journal" = replay acts, "files" = re-scan). */
  rebuild(from: 'journal' | 'files'): EnvelopeNode[];
}
