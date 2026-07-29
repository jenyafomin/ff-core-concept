/**
 * ingest — the P1 runner: drive a RowSource (Orders then Transactions) through the reducers into
 * `engine.write`, tallying a run summary (same observable-CQRS shape as @ff/ingest-rentacar). Orders
 * are ingested BEFORE Transactions so the order/car nodes exist before the payments that point at them
 * (not required by the projection — edges are plain strings — but it keeps the log causally ordered).
 */
import type { EngineClient } from '@ff/engine';
import type { Row, RowSource } from '@ff/ingest-rentacar';
import { reduceOrderRow, reducePaymentRow, type RowResult } from './core/reduce.js';

export interface IngestSummary {
  emitted: number;
  deduped: number;
  quarantined: number;
  refused: number;
  quarantineLog: string[];
  refusedLog: string[];
}

type Reducer = (row: Row) => RowResult;

const SHEETS: ReadonlyArray<{ sheet: string; reduce: Reducer }> = [
  { sheet: 'Orders', reduce: reduceOrderRow },
  { sheet: 'Transactions', reduce: reducePaymentRow },
];

export function runPaymentIngest(engine: EngineClient, source: RowSource): IngestSummary {
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
      const result = reduce(row);
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
