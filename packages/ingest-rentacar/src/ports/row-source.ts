/**
 * RowSource — the ingest's INBOUND port over "some tabular upstream" (spec §8). One method:
 * `readRows(sheet)` returns the raw rows of a named sheet. The engine ingest never talks to Google
 * Sheets / Postgres directly — it talks to THIS port, so the real data source is a swap-in adapter
 * (fixture now; live Sheets/PG after F-D) behind a fixed seam, per the plug-in principle.
 *
 * A Row is deliberately untyped (`Record<string, unknown>`): upstream columns are dirty and drift
 * (see data-verification.analysis — glued suffixes, placeholder plates, non-tabular junk in cells),
 * so the reducer — not the port — owns interpretation. The port only yields rows verbatim.
 */
export type SheetName = 'Orders' | 'Cars' | (string & {});

/** One upstream row, column-name → raw cell value (strings/numbers/empty as the sheet holds them). */
export type Row = Record<string, unknown>;

export interface RowSource {
  /** Return every data row of `sheet` verbatim. Empty array if the sheet is unknown/empty. */
  readRows(sheet: SheetName): Row[];
}
