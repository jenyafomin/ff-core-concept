/**
 * balance-observer — the FIRST honest agent-cycle (BUILD-P1 §4). NOT an ETL: it READS the graph
 * (the projected read-model), COMPUTES something real (remaining balance + discrepancies), and WRITES
 * that knowledge BACK as an `observation` act through the same engine — which SURVIVES the session
 * (it rides the append-only journal, so the next read sees it as context). The oracle is arithmetic,
 * not the owner's markup.
 *
 * Reads route through the SINGLE PEP: `engine.resolve('read', viewer, node)` gates every node before
 * the agent sees it (I-7). It does NOT use `engine.view()` — that calls assertValid(), which would
 * REFUSE the graph over the intentional orphan (dangling) edge; resolve() is pure policy and does not.
 *
 * `observation` acts are non-projectable (act-kinds §3): they ride the log as a side-journal and never
 * mutate canonical state — exactly what a "context note that outlives the session" should be.
 */
import { load, type Act, type EngineClient, type Graph, type StorePort } from '@ff/engine';
import { hashOf } from '@ff/ingest-rentacar';
import { OBSERVER_ACTOR } from '../core/keys.js';
import { computeOrderBalance, orphanPayments } from '../balance.js';

/** The knowledge one cycle produced (also the shape persisted in an observation act's payload). */
export interface BalanceObservation {
  subject: 'order' | 'orphan-payment';
  ref: string;
  total?: number;
  paidSum?: number;
  remaining?: number;
  amount?: number;
  discrepancies: string[];
}

const OBS_KIND = 'balance-observation';

export class BalanceObserver {
  constructor(
    private readonly engine: EngineClient,
    private readonly store: StorePort,
    private readonly viewer: string = OBSERVER_ACTOR,
  ) {}

  /** Read the projection THROUGH the PEP — only nodes the agent is allowed to read (I-7). */
  private readGraph(): Graph {
    const readable = this.store.load().filter((n) => this.engine.resolve('read', this.viewer, n) === 'allow');
    return load(readable);
  }

  /** The observations already on the journal (survive-the-session read-back). */
  readObservations(): BalanceObservation[] {
    return this.store
      .acts()
      .filter((a) => a.actKind === 'observation' && isBalanceObs(a))
      .map((a) => a.payload as unknown as BalanceObservation);
  }

  /**
   * One read→compute→write cycle. Idempotent: an observation whose content is unchanged is not
   * re-appended (deterministic act id keyed on the payload hash). Returns what the graph now says
   * (freshly computed), regardless of whether each was newly written or already present.
   */
  observe(): BalanceObservation[] {
    const graph = this.readGraph();
    const out: BalanceObservation[] = [];

    for (const order of graph.nodes.filter((n) => n.type === 'order')) {
      const bal = computeOrderBalance(graph, order.id);
      if (!bal) continue;
      const obs: BalanceObservation = {
        subject: 'order',
        ref: bal.orderRef,
        total: bal.total,
        paidSum: bal.paidSum,
        remaining: bal.remaining,
        discrepancies: bal.discrepancies,
      };
      this.writeOnce(obs);
      out.push(obs);
    }

    for (const orphan of orphanPayments(graph)) {
      const obs: BalanceObservation = {
        subject: 'orphan-payment',
        ref: orphan.ref,
        amount: orphan.amount,
        discrepancies: [`ORPHAN: payment ${orphan.amount} paid-against ${orphan.orderTarget} — no such order in the graph`],
      };
      this.writeOnce(obs);
      out.push(obs);
    }
    return out;
  }

  /** Write an observation act unless a byte-identical one is already on the journal (idempotent). */
  private writeOnce(obs: BalanceObservation): void {
    const hash = hashOf(obs).slice(0, 12);
    const id = `act:obs:balance:${obs.ref}:${hash}`;
    if (this.store.acts().some((a) => a.id === id)) return; // already observed, unchanged
    const act: Act = {
      id,
      actor: this.viewer,
      provenance: { source_ref: obs.ref, kind: OBS_KIND },
      recordedAt: '',
      actKind: 'observation',
      edges: [],
      payload: { type: OBS_KIND, ...obs },
    };
    this.engine.write(act);
  }
}

function isBalanceObs(a: Act): boolean {
  const p = a.payload;
  return p !== null && typeof p === 'object' && (p as Record<string, unknown>).type === OBS_KIND;
}
