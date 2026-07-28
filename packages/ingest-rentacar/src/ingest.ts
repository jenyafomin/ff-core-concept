/**
 * ingest — the runner (spec §9): drive a RowSource through the reducer into `engine.write`, tallying
 * a run summary. This is the ONLY place that touches the engine; the reducer stays pure.
 *
 * The summary makes the CQRS behaviours observable:
 *  - `emitted`     : acts newly appended to the journal.
 *  - `deduped`     : acts the engine recognised as byte-identical re-writes (T1 — a 2nd run is all-dedup).
 *  - `quarantined` : rows that produced NO act (broken `#` etc., §7) — counted + logged, never silent.
 *  - `refused`     : acts the admission-gate REFUSED (should be 0 for clean ingest; a non-zero here is
 *                    a red flag that PII leaked inline — surfaced, not swallowed).
 */
import type { EngineClient } from '@ff/engine';
import { reduceCarRow, reduceOrderRow, type RowResult } from './core/reduce.js';
import type { PayloadStore } from './ports/payload-store.js';
import type { Row, RowSource } from './ports/row-source.js';

export interface IngestSummary {
  emitted: number;
  deduped: number;
  quarantined: number;
  refused: number;
  quarantineLog: string[];
  refusedLog: string[];
}

type Reducer = (row: Row, store: PayloadStore) => RowResult;

const SHEETS: ReadonlyArray<{ sheet: string; reduce: Reducer }> = [
  { sheet: 'Cars', reduce: reduceCarRow }, // cars first so `drives` edge targets already exist as nodes
  { sheet: 'Orders', reduce: reduceOrderRow },
];

export function runIngest(engine: EngineClient, source: RowSource, store: PayloadStore): IngestSummary {
  const summary: IngestSummary = {
    emitted: 0,
    deduped: 0,
    quarantined: 0,
    refused: 0,
    quarantineLog: [],
    refusedLog: [],
  };

  for (const { sheet, reduce } of SHEETS) {
    for (const row of source.readRows(sheet)) {
      const result = reduce(row, store);
      if (!result.ok) {
        summary.quarantined++;
        summary.quarantineLog.push(result.quarantine);
        continue;
      }
      for (const act of result.acts) {
        const ack = engine.write(act);
        if (!ack.ok) {
          summary.refused++;
          summary.refusedLog.push(`${act.id}: ${ack.reason}`);
        } else if (ack.dedup) {
          summary.deduped++;
        } else {
          summary.emitted++;
        }
      }
    }
  }

  return summary;
}
