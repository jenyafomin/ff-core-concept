/**
 * store-memory — in-memory StorePort adapter. The primary M0/M1 adapter. It holds three things and
 * keeps the CQRS split honest:
 *   - `base`      : the loaded substrate nodes (seed corpus, e.g. policy:constitution) — NOT projected.
 *   - `journal`   : the append-only write-model (system-of-record) of acts.
 *   - `projection`: the read-model — graph nodes reduced from the journal's `domain_event`s.
 *
 * `load()` returns base ⊕ projection (the current graph the engine reads). `writeAct` appends to the
 * log AND folds the act into the projection incrementally; `rebuild('journal')` tears the projection
 * down to empty and re-folds the whole log — bit-for-bit equal to the incremental result by
 * construction (both go through the one pure reducer in core/projection). This is the ADR-0008
 * Validation §2 gate made real (replaces the former M0 rebuild stub).
 */
import { foldInto, project } from '../core/projection.js';
import type { Act, EnvelopeNode, PredicateRegistry } from '../core/types.js';
import type { StorePort } from '../ports/store-port.js';

export class MemoryStore implements StorePort {
  /** The non-projected substrate (seed nodes). */
  private base: EnvelopeNode[];
  private readonly baseById: Map<string, EnvelopeNode>;
  /** append-only write-model (system-of-record). */
  private readonly journal: Act[] = [];
  /** read-model: source_ref → projected node, folded from the journal's domain_events. */
  private projection = new Map<string, EnvelopeNode>();
  /**
   * GAP 2 / G1: the TENANT predicate registry (cardinality-as-data), injected here. Defaults to `{}` —
   * the kernel knows no domain noun; a tenant passes its own `{ … : 'one' }` at construction so its
   * `one`-relations replace instead of accumulate. Unregistered predicates still fold as `many`.
   */
  private readonly registry: PredicateRegistry;

  constructor(nodes: EnvelopeNode[], registry: PredicateRegistry = {}) {
    this.base = [...nodes];
    this.baseById = new Map(this.base.map((n) => [n.id, n]));
    this.registry = registry;
  }

  /** The current graph (read-model): substrate nodes plus the log-projected nodes. */
  load(): EnvelopeNode[] {
    return [...this.base, ...this.projection.values()];
  }

  readNode(id: string): EnvelopeNode | null {
    return this.projection.get(id) ?? this.baseById.get(id) ?? null;
  }

  writeAct(act: Act): Act {
    this.journal.push(act);
    foldInto(this.projection, act, this.registry); // incremental projection: domain_event → its node
    return act;
  }

  /** Read-only view of the append-only journal (write-model reader for CQRS/rebuild + PII greps). */
  acts(): readonly Act[] {
    return this.journal;
  }

  /** Test/inspection hook: tear the read-model down to empty (base substrate untouched). */
  dropProjection(): void {
    this.projection = new Map();
  }

  rebuild(from: 'journal' | 'files'): EnvelopeNode[] {
    // ADR-0008: the graph is a deterministic projection of the log. Tear it down and re-fold every act
    // from the write-model — no incremental state consulted, so this is a true rebuild-from-journal.
    // (from==='files' is the M0 no-op: the base substrate is the source; the seam is additive-shaped.)
    if (from === 'journal') this.projection = project(this.journal, this.registry);
    return this.load();
  }
}
