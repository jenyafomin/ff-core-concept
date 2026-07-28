/**
 * FixtureRowSource — the M1 RowSource adapter (spec §8). Reads JSON fixtures that live INSIDE this
 * package (`test/fixtures/<sheet>.json` by default), NOT the external rentacar project. The fixtures
 * reproduce the SHAPES verified against live data (data-verification.analysis): glued/spaced `#`
 * suffixes, `SOLD-*` plates, broken/empty `#`, PII columns, negative `Remaining`.
 *
 * A fixture file is either a bare `Row[]` or `{ rows: Row[] }`. Unknown sheet ⇒ [] (no throw).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Row, RowSource, SheetName } from '../ports/row-source.js';

export class FixtureRowSource implements RowSource {
  constructor(private readonly dir: string) {}

  readRows(sheet: SheetName): Row[] {
    const file = join(this.dir, `${sheet.toLowerCase()}.json`);
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : (parsed as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as Row[]) : [];
  }
}
