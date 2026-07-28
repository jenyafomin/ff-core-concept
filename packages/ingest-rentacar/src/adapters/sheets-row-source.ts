/**
 * SheetsRowSource — SKELETON for the live upstream (Google Sheets / the synced Postgres mirror),
 * behind the SAME RowSource port as the fixture adapter. Deliberately UNIMPLEMENTED at M1.
 *
 * ⚑ Waits on F-D (spec §0 "F-D открыто, за владельцем", §8, §10): the real source needs the full
 * Orders export (4102 rows) or a sanctioned, non-secret read path to `rentacar_analytics_pg`. Data /
 * credential access is the owner's call — this adapter does NOT read `.env`, service-account files,
 * or open a DB connection (security rule). It exists only to prove the seam is a swap, not a rewrite.
 */
import type { Row, RowSource, SheetName } from '../ports/row-source.js';

export interface SheetsSourceConfig {
  /** e.g. Google spreadsheetId, or a PG DSN — supplied by the OWNER, never hardcoded/read from disk here. */
  ref?: string;
}

export class SheetsRowSource implements RowSource {
  constructor(private readonly _config: SheetsSourceConfig = {}) {}

  readRows(_sheet: SheetName): Row[] {
    throw new Error(
      'SheetsRowSource is not implemented at M1 — the live Sheets/PG source is GATED on F-D ' +
        '(full Orders export or a sanctioned non-secret DB path, owner-owned). Use FixtureRowSource until then.',
    );
  }
}
