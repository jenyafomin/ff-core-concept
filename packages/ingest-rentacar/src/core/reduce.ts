/**
 * reduce — the ingest write-model reducer (spec §2–§7): one upstream Row → zero-or-more
 * `domain_event` acts, DETERMINISTICALLY. Pure over (row, PayloadStore) — no engine, no clock, no I/O
 * beyond the content-addressed PayloadStore. The runner (`ingest.ts`) is what actually calls
 * `engine.write`; keeping the transform pure is what makes idempotency (T1) and rebuild (RB) hold.
 *
 * Invariants enforced HERE (not left to the caller):
 *  - §3 key: Order = `sheets:Orders#<^\d+-\d+>`; Car = `sheets:Cars#<plate>` with SOLD-* re-keyed +
 *    flagged `placeholder_plate`. Keys go into `provenance` + edge `target` ONLY — both are unscanned
 *    by admission; the numeric-dash key trips the phone heuristic, so it must never be inlined.
 *  - §5 PII: name / phone / Recent Note NEVER inline. They go OUT to the PayloadStore; the act keeps
 *    only `{ payloadRef, payloadHash }`. Inline `payload` holds strictly non-PII passport fields.
 *  - §4 idempotency: `snapshotHash` folds ALL upstream fields (incl. PII, as a one-way digest) so a
 *    changed row supersedes and an unchanged row dedups.
 *  - §7 quarantine: a broken/empty `#` (or an unkeyable car) yields NO act and a reason string.
 */
import type { Act, Edge } from '@ff/engine';
import { hashOf } from './hash.js';
import {
  carSourceRef,
  customerSourceRef,
  isPlaceholderPlate,
  orderNumCore,
  orderSourceRef,
} from './keys.js';
import type { PayloadStore } from '../ports/payload-store.js';
import type { Row } from '../ports/row-source.js';

export const ACTOR = 'sync:ga-rentacar';

/** Reducing a row either yields acts, or quarantines the row with a visible reason (§7). */
export type RowResult =
  | { ok: true; acts: Act[] }
  | { ok: false; quarantine: string };

// ── tolerant cell accessors (upstream columns are dirty; the reducer owns interpretation) ────────
function str(row: Row, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}
function num(row: Row, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}
/** Leading alpha run of "Daily400.00" → "Daily" (rent type parsed off the glued Order Type). */
function rentType(orderType: string | undefined): string | undefined {
  const m = orderType?.match(/^[A-Za-z]+/);
  return m ? m[0] : undefined;
}
/** Drop undefined values so the snapshot/body is canonical regardless of which columns were present. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * Orders row → an `order` act (+ a per-occurrence `customer` act). Returns quarantine if the `#`
 * column has no leading `\d+-\d+` (empty / non-tabular junk like "Check Levels:").
 */
export function reduceOrderRow(row: Row, store: PayloadStore): RowResult {
  const numCore = orderNumCore(row['#']);
  if (numCore === null) {
    return { ok: false, quarantine: `Orders row: unparseable '#'=${JSON.stringify(row['#'])} (no leading \\d+-\\d+)` };
  }

  const name = str(row, 'Customer', 'Customer Name', 'Name');
  const phone = str(row, 'Mobile', 'Phone', 'Customer Phone');
  const recentNote = str(row, 'Recent Note', 'Note');
  const plate = str(row, 'Plate No', 'Plate', 'Plate Number');
  const orderType = str(row, 'Order Type');

  const orderRef = orderSourceRef(numCore);
  const custRef = customerSourceRef(numCore);
  // Order → Car link lives ONLY on the edge target (unscanned). A SOLD placeholder in an order row is
  // unusual and unkeyable without a discriminator, so we simply omit the drives edge in that case.
  const carRef = plate && !isPlaceholderPlate(plate) ? carSourceRef(plate, undefined) : null;

  // §5 PII OUT: name/phone → the customer's payload; Recent Note → the order's payload. Only refs return.
  const custPii = store.put(compact({ name, phone }));
  const orderPii = recentNote !== undefined ? store.put(compact({ recentNote })) : undefined;

  // §4: fold EVERYTHING (incl. PII, as a one-way digest) so any upstream change supersedes.
  const orderSnapshot = hashOf(
    compact({ numCore, plate, orderType, remaining: num(row, 'Remaining'), numberOfDays: num(row, 'Number of Days'), status: str(row, 'Status'), openTime: str(row, 'Order Open Time'), expectedReturn: str(row, 'Expected Return Date'), completedOn: str(row, 'Completed on'), name, phone, recentNote }),
  );
  const custSnapshot = hashOf(compact({ numCore, name, phone }));

  // Inline payload = strictly non-PII passport fields → become node body (projection reads these).
  // numCore/plate are DELIBERATELY absent (they trip the phone heuristic); they live in the key/edges.
  const orderEdges: Edge[] = [{ predicate: 'rented', target: custRef, meta: { role: 'renter' } }];
  if (carRef) orderEdges.push({ predicate: 'drives', target: carRef.sourceRef });

  const orderAct: Act = {
    id: `act:order:${numCore}:${orderSnapshot.slice(0, 8)}`,
    actor: ACTOR,
    provenance: { source_ref: orderRef, snapshotHash: orderSnapshot },
    recordedAt: '', // engine-assigned
    actKind: 'domain_event',
    edges: orderEdges,
    payload: compact({ type: 'order', orderType, rentType: rentType(orderType), remaining: num(row, 'Remaining'), numberOfDays: num(row, 'Number of Days'), status: str(row, 'Status') }),
    ...(orderPii ? { payloadRef: orderPii.payloadRef, payloadHash: orderPii.payloadHash } : {}),
  };

  const customerAct: Act = {
    id: `act:customer:${numCore}:${custSnapshot.slice(0, 8)}`,
    actor: ACTOR,
    provenance: { source_ref: custRef, snapshotHash: custSnapshot },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload: { type: 'customer', hasPhone: phone !== undefined },
    payloadRef: custPii.payloadRef,
    payloadHash: custPii.payloadHash,
  };

  return { ok: true, acts: [orderAct, customerAct] };
}

/**
 * Cars (EXP) row → a `car` act. `SOLD-*` plate is re-keyed off a stable discriminator and flagged
 * `placeholder_plate` (§3). Quarantines a row with no usable key at all (blank plate / "-").
 */
export function reduceCarRow(row: Row, _store: PayloadStore): RowResult {
  const plate = str(row, 'Plate Number', 'Plate No', 'Plate');
  const nodeId = row['NODE ID (#)'] ?? row['NODE ID'] ?? row['Mama Car ID'];
  const key = carSourceRef(plate, nodeId);
  if (key === null) {
    return { ok: false, quarantine: `Cars row: unkeyable plate=${JSON.stringify(plate)} nodeId=${JSON.stringify(nodeId)}` };
  }

  const model = str(row, 'Model', 'Car Model');
  const make = str(row, 'Make', 'Brand');
  const status = str(row, 'Status');

  const snapshot = hashOf(compact({ plate, model, make, status, placeholderPlate: key.placeholderPlate, nodeId: typeof nodeId === 'string' || typeof nodeId === 'number' ? nodeId : undefined }));

  const carAct: Act = {
    id: `act:car:${key.sourceRef}:${snapshot.slice(0, 8)}`,
    actor: ACTOR,
    provenance: { source_ref: key.sourceRef, snapshotHash: snapshot },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    // Non-PII passport. `placeholder_plate` is the visible flag (§3); the plate itself is the key/id.
    payload: compact({ type: 'car', model, make, status, placeholder_plate: key.placeholderPlate }),
  };

  return { ok: true, acts: [carAct] };
}
