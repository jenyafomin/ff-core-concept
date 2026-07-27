/**
 * store-md — md-file persistence adapter that DELEGATES to @ff/core's FileNodeStore rather than
 * forking a second files-as-graph store (DoD item 10: "depend, don't fork").
 *
 * ── The genuinely-unsolved seam (documented, not hand-waved) ──────────────────────────────────
 * @ff/core's node model (FFNode: id·kind·title·body·tags·links) is a DIFFERENT substrate from the
 * engine's EnvelopeNode (id·type·state·edges·view·visibility·access·acts·policy_ref·body). For M0 we
 * do the SIMPLEST correct thing: persist each EnvelopeNode as an FFNode *carrier* (kind:'note',
 * body = JSON of the envelope) and each Act as a 'trace' carrier — reusing @ff/core's real fs +
 * frontmatter + validation machinery. This proves the dependency is load-bearing (see the store-md
 * smoke test) while keeping the mapping honestly provisional.
 *
 * TODO(M3): reconcile the two node models (the store-port ↔ @ff/core seam) instead of carrying
 * envelopes as opaque JSON blobs. Until then, the SYNC StorePort contract at M0 is served by
 * MemoryStore; this adapter is the async @ff/core bridge that hydrates a MemoryStore from disk.
 */
import { FileNodeStore } from '@ff/core';
import type { Act, EnvelopeNode } from '../core/types.js';
import { MemoryStore } from './store-memory.js';

const NODE_CARRIER_MARK = 'envelope';
const ACT_CARRIER_MARK = 'act';

export class MdEnvelopeStore {
  private readonly inner: FileNodeStore;

  constructor(root: string) {
    this.inner = new FileNodeStore(root);
  }

  /** Persist an EnvelopeNode as an @ff/core carrier node (delegated fs/frontmatter/validation). */
  async writeNode(node: EnvelopeNode): Promise<void> {
    const existing = await this.inner.get(node.id);
    const carrier = {
      id: node.id,
      kind: 'note' as const,
      title: node.id,
      body: JSON.stringify(node),
      meta: { carrier: NODE_CARRIER_MARK, envelopeType: node.type },
    };
    if (existing) await this.inner.update(node.id, carrier);
    else await this.inner.create(carrier);
  }

  /** Persist an Act as an @ff/core 'trace' carrier (append-only write-model on disk). */
  async writeAct(act: Act): Promise<void> {
    await this.inner.create({
      id: act.id,
      kind: 'trace',
      title: `${act.actKind}:${act.id}`,
      body: JSON.stringify(act),
      actor: act.actor,
      meta: { carrier: ACT_CARRIER_MARK },
    });
  }

  /** Load every EnvelopeNode carrier back off disk (via @ff/core). */
  async loadEnvelopeNodes(): Promise<EnvelopeNode[]> {
    const all = await this.inner.list();
    return all
      .filter((n) => (n.meta as Record<string, unknown> | undefined)?.carrier === NODE_CARRIER_MARK)
      .map((n) => JSON.parse(n.body) as EnvelopeNode);
  }

  /** Hydrate a sync MemoryStore (the M0 StorePort) from what @ff/core has on disk. */
  async toMemoryStore(): Promise<MemoryStore> {
    return new MemoryStore(await this.loadEnvelopeNodes());
  }
}
