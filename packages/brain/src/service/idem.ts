// @ff/brain/service/idem — idempotency index (SPEC R-8, AC-24…26). Lives INSIDE the write queue:
// the same idem → the ORIGINAL answer (record: `dedup:true`), no new act — even if the args differ
// (a retried gateway turn may rephrase). Built from the journal on load (`provenance.idem`), so a replay
// after a restart still dedups; answers given in this process are kept verbatim.
//
//   W2: the index key is SERVER-namespaced — sha256(conversation \n client idem) — so a caller replaying another
//       dialog's idem never receives that dialog's receipt.
//   F-5: each entry keeps a keyed tag of the request body. Same idem + other body → the original answer PLUS a
//       IDEM_BODY_MISMATCH warning (never a silent «Записано: <old label>»).
//   Journal form of `provenance.idem`: `<64-hex key>.<body tag a–p>`. Stamps in any other (pre-W2) form are
//   not indexed: their key cannot be bound to a dialog.
import { createHash } from 'node:crypto';

import { isProjectable, sourceRefOf, type Act, type StorePort } from '@ff/engine';

import { formatReceipt, type BrainWarning, type LinkResponse, type RecordResponse, type RecordStatus } from '../contract.js';
import { K } from '../domain/genesis.js';
import { decodeNode, edgeStatus } from '../domain/to-act.js';

import { recordReceipt, scopesLabelOf, type VisibleScopes } from './receipt.js';

export type IdemAnswer = ({ verb: 'record'; res: RecordResponse } | { verb: 'link'; res: LinkResponse }) & {
  /** Keyed tag of the original request body (absent → unknown, never reported as a mismatch). */
  body?: string;
  /** Rebuilt from the journal: the receipt is rendered at replay time for the caller's visible scopes. */
  render?: (visible: VisibleScopes) => string;
  /**
   * link only: the edge target. On replay `dangling` is recomputed for the replaying reader by the domain
   * rule (`targetMissingFor`, F-2) — a hidden target reads exactly like a missing one, never an existence oracle.
   */
  target?: string;
};

/** Server-side idem key (W2): the client idem bound to the caller's dialog. */
export function idemKey(dialog: string, clientIdem: string): string {
  return createHash('sha256').update(`${dialog}\n${clientIdem}`).digest('hex');
}

/** What is stamped into `provenance.idem`. */
export const idemStamp = (key: string, bodyTag: string): string => `${key}.${bodyTag}`;

const STAMP_RE = /^([0-9a-f]{64})\.([a-p]{1,64})$/;

export function parseIdemStamp(s: unknown): { key: string; body: string } | null {
  if (typeof s !== 'string') return null;
  const m = STAMP_RE.exec(s);
  return m ? { key: m[1]!, body: m[2]! } : null;
}

export const idemBodyMismatch = (): BrainWarning => ({
  code: 'IDEM_BODY_MISMATCH',
  message: 'этот вызов уже был выполнен с ДРУГИМ содержимым — возвращён исходный результат, новое НЕ записано',
});

export class IdemIndex {
  private readonly answers = new Map<string, IdemAnswer>();

  get size(): number {
    return this.answers.size;
  }

  get(key: string): IdemAnswer | undefined {
    return this.answers.get(key);
  }

  set(key: string, answer: IdemAnswer): void {
    this.answers.set(key, answer);
  }

  /** Rebuild from the journal: every act with a W2 `provenance.idem` stamp (record acts carry a payload, links don't). */
  static fromJournal(store: Pick<StorePort, 'acts' | 'readNode'>): IdemIndex {
    const idx = new IdemIndex();
    const revs = new Map<string, number>();
    for (const act of store.acts()) {
      const ref = isProjectable(act) ? sourceRefOf(act) : undefined;
      if (typeof ref !== 'string') continue;
      const rev = (revs.get(ref) ?? 0) + 1;
      revs.set(ref, rev);
      const stamp = parseIdemStamp((act.provenance as { idem?: unknown } | undefined)?.idem);
      if (!stamp) continue;
      const answer = answerFromAct(act, ref, rev, store);
      if (answer) idx.set(stamp.key, { ...answer, body: stamp.body });
    }
    return idx;
  }
}

/** Reconstruct the answer a journaled act was acknowledged with (after a restart). */
function answerFromAct(act: Act, id: string, rev: number, store: Pick<StorePort, 'readNode' | 'acts'>): IdemAnswer | null {
  if (act.payload !== undefined) {
    const body = act.payload as Record<string, unknown>;
    const meta = (body.meta ?? {}) as { status?: RecordStatus };
    const prov = act.provenance as { type?: unknown; type_v?: unknown };
    const type = typeof body.type === 'string' ? body.type : typeof prov.type === 'string' ? prov.type : '';
    const status: RecordStatus = meta.status ?? 'active';
    return {
      verb: 'record',
      res: {
        ok: true,
        id,
        rev,
        type,
        type_v: typeof prov.type_v === 'number' ? prov.type_v : 1,
        status,
        dedup: true,
        warnings: [],
        receipt: '',
      },
      render: (visible) => recordReceipt(body, id, type, store, visible),
    };
  }
  const edge = (act.edges ?? []).find((e) => e.predicate !== K.preds.owner);
  if (!edge?.id) return null;
  const node = store.readNode(id);
  const current = node ? decodeNode(node) : null;
  const edgeId = edge.id;
  const status = edgeStatus(edge);
  return {
    verb: 'link',
    res: {
      ok: true,
      edge_id: edge.id,
      // placeholder: replay recomputes it per reader via `targetMissingFor` (F-2); fail-closed until then
      dangling: true,
      receipt: '',
    },
    target: edge.target,
    render: (visible) =>
      formatReceipt({
        label: current?.label ?? id,
        scope: scopesLabelOf(id, store, visible),
        type: current?.type ?? '',
        status,
        id: edgeId,
      }),
  };
}
