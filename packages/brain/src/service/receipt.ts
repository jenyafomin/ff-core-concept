// @ff/brain/service/receipt — the owner-facing receipt line, built the SAME way for a live write and for an
// idem replay rebuilt from the journal (so a post-restart replay shows the identical text).
//   F-7: a record whose body carries its own `status` (task: open/done) shows THAT while the record is active;
//        any other record status (proposed/retracted/superseded) wins — it is what the owner must see.
//   F-8: every scope the record lives in is listed («→ p1, p2»), not only the first — but only scopes the
//        CALLER can see (`visible` = reader.scopes): a receipt never names a foreign scope (critic F-2).
import type { StorePort } from '@ff/engine';

import { formatReceipt, type Receipt, type ReceiptParts, type RecordStatus } from '../contract.js';
import { ID_PREFIX } from '../domain/genesis.js';
import { decodeNode } from '../domain/to-act.js';

type ReadNode = Pick<StorePort, 'readNode'>;

/** Human name of a scope: its slug, else the id without the scope prefix. */
export function scopeLabelOf(scopeId: string | undefined, store: ReadNode): string {
  if (!scopeId) return '';
  const b = (store.readNode(scopeId)?.body ?? {}) as Record<string, unknown>;
  if (typeof b.slug === 'string') return b.slug;
  return scopeId.startsWith(ID_PREFIX.scope) ? scopeId.slice(ID_PREFIX.scope.length) : scopeId;
}

/** Scope ids a caller may see (reader.scopes). */
export type VisibleScopes = ReadonlySet<string>;

/** The record's scopes (current projection) the caller may see, comma-joined. */
export function scopesLabelOf(recordId: string, store: ReadNode, visible: VisibleScopes): string {
  const node = store.readNode(recordId);
  if (!node) return '';
  return decodeNode(node)
    .scopes.filter((s) => visible.has(s))
    .map((s) => scopeLabelOf(s, store))
    .filter((s) => s !== '')
    .join(', ');
}

/** The status the owner reads (F-7). */
export function displayStatus(recordStatus: RecordStatus, body: Record<string, unknown>): string {
  return recordStatus === 'active' && typeof body.status === 'string' && body.status !== '' ? body.status : recordStatus;
}

/** Receipt of a record act from its payload (live: the planned act; replay: the journaled act). */
export function recordReceipt(
  payload: Record<string, unknown>,
  id: string,
  type: string,
  store: ReadNode,
  visible: VisibleScopes,
): Receipt {
  const meta = (payload.meta ?? {}) as { status?: RecordStatus };
  const status = displayStatus(meta.status ?? 'active', payload);
  const label = typeof payload.label === 'string' ? payload.label : id;
  return formatReceipt({
    label,
    scope: scopesLabelOf(id, store, visible),
    type,
    // the task's own status is free text on the wire; formatReceipt only interpolates it
    status: status as ReceiptParts['status'],
    id,
  });
}
