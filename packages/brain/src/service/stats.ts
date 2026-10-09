// @ff/brain/service/stats + export — reader-gated aggregates and a JSON dump (R-5 routes; full G3 support
// is C2). Both see exactly what `find` would: PEP ∧ scope gate, retracted hidden.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ExportRequest, ExportResponse, NodeView, Reader, StatsResponse } from '../contract.js';
import { ID_PREFIX } from '../domain/genesis.js';
import { createReadGate, visibleRecords, type ReadDeps } from '../read/access.js';
import { toNodeView } from '../read/read.js';

import { tsStamp } from './journal.js';

function scopeName(id: string, deps: ReadDeps): string {
  const b = (deps.store.readNode(id)?.body ?? {}) as Record<string, unknown>;
  if (typeof b.slug === 'string') return b.slug;
  return id.startsWith(ID_PREFIX.scope) ? id.slice(ID_PREFIX.scope.length) : id;
}

export function stats(reader: Reader, deps: ReadDeps): StatsResponse {
  const gate = createReadGate(reader, deps);
  const res: StatsResponse = { ok: true, total: 0, by_scope: {}, by_type: {} };
  for (const v of visibleRecords(gate, deps)) {
    res.total += 1;
    res.by_type[v.rec.type] = (res.by_type[v.rec.type] ?? 0) + 1;
    for (const s of v.rec.scopes) {
      const name = scopeName(s, deps);
      res.by_scope[name] = (res.by_scope[name] ?? 0) + 1;
    }
  }
  return res;
}

/** Write the reader-visible records (∩ `req.scopes` if given) to `<exportDir>/brain-export-<ts>.json` (0600). */
export function exportRecords(reader: Reader, req: ExportRequest, deps: ReadDeps & { exportDir: string; now: Date }): ExportResponse {
  const gate = createReadGate(reader, deps);
  const want = req.scopes?.length ? new Set(req.scopes.map((s) => gate.scopeIdOf(s))) : null;
  const nodes: NodeView[] = [];
  for (const v of visibleRecords(gate, deps)) {
    if (want && ![...gate.closure(v.rec.scopes)].some((s) => want.has(s))) continue;
    nodes.push(toNodeView(v.rec, deps));
  }
  const path = join(deps.exportDir, `brain-export-${tsStamp(deps.now)}.json`);
  writeFileSync(path, JSON.stringify({ exported_at: deps.now.toISOString(), reader: reader.key, records: nodes }, null, 2), {
    mode: 0o600,
  });
  return { ok: true, path, count: nodes.length };
}
