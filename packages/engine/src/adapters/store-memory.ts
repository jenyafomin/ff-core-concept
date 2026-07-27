/**
 * store-memory — in-memory StorePort adapter. The primary M0 adapter: loads a node list (the seed
 * fixture corpus in tests) and keeps an append-only in-memory journal of acts (write-model).
 *
 * The graph (read-model) is a projection over the loaded nodes; `rebuild('journal')` is a stub-shaped
 * no-op at M0 (full act→projection replay is M2+), but the seam is present and additive-shaped.
 */
import type { Act, EnvelopeNode } from '../core/types.js';
import type { StorePort } from '../ports/store-port.js';

export class MemoryStore implements StorePort {
  private nodes: EnvelopeNode[];
  private readonly byId: Map<string, EnvelopeNode>;
  /** append-only write-model (system-of-record). */
  private readonly journal: Act[] = [];

  constructor(nodes: EnvelopeNode[]) {
    this.nodes = [...nodes];
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
  }

  load(): EnvelopeNode[] {
    return this.nodes;
  }

  readNode(id: string): EnvelopeNode | null {
    return this.byId.get(id) ?? null;
  }

  writeAct(act: Act): Act {
    this.journal.push(act);
    return act;
  }

  /** Read-only view of the append-only journal (for CQRS/rebuild + tests that grep for PII). */
  acts(): readonly Act[] {
    return this.journal;
  }

  rebuild(from: 'journal' | 'files'): EnvelopeNode[] {
    // M0: projection == the loaded node set. TODO(M2): replay `journal` acts into the projection
    // (from==='journal') per ADR-0008 CQRS. The seam is additive-shaped so M2 adds, never edits core.
    void from;
    return this.nodes;
  }
}
