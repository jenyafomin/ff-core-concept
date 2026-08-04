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
 *
 * ── file-first «перо» (ADR-0006 §(f)) ─────────────────────────────────────────────────────────
 * `doc/adr/spec/prompt` etc. are AUTHOR-PRIMARY files: the human edits the .md by hand and the act is
 * DERIVED from the file diff — the engine is "first READER", not "first writer". `ingest()` + `detectStale()`
 * below realize the MINIMAL correct slice of that: an explicit (not live-watcher) op that hashes the current
 * file content, diffs it against the last-known snapshot, and produces a `source:'file-first'` act when it
 * changed — so a hand-edit can no longer diverge the graph from the file SILENTLY. The genuinely-unsolved
 * design forks (act kind, the prose→envelope mapping = TODO(M3), whether the watcher is live, the §(g)
 * eligibility whitelist + write-time gate) are flagged inline and returned to the owner, not invented.
 */
import { createHash } from 'node:crypto';
import { FileNodeStore } from '@ff/core';
import type { Act, EnvelopeNode, Provenance, SubjectRef } from '../core/types.js';
import { MemoryStore } from './store-memory.js';

const NODE_CARRIER_MARK = 'envelope';
const ACT_CARRIER_MARK = 'act';

/**
 * Source marker on a file-first act's provenance: the act was DERIVED from an external md file's
 * content (ADR-0006 §(f): the file is author-primary / write-model; the act is produced by diff). This
 * distinguishes a `first-reader` act (engine observed a hand-edit) from a `first-writer` act (engine's
 * own `engine.write()` API-first path). Downstream this is the "source = external file" staleness/source
 * label the ADR requires so the projection never silently diverges from a hand-edited file.
 */
export const FILE_FIRST_SOURCE = 'file-first' as const;

/**
 * The subset of @ff/core node kinds treated as file-first "human content" for this MINIMAL slice.
 *
 * ⚠️ DESIGN FORK (NOT decided here — returned to owner). ADR-0006 §(g) keys file-first eligibility on the
 * engine's `meta:type` whitelist (doc · config · prompt · agent · adr · spec · lens) AND excludes every
 * access/registry/policy-bearing type as DB-first-ONLY (ADR-0004 D4), gated by a write-TIME capability
 * check that does NOT exist yet. @ff/core's FFNode.kind (task/note/agent/trace/…) is a DIFFERENT taxonomy
 * (the very store-port ↔ @ff/core seam of TODO(M3)). Mapping one onto the other, and enforcing the §(g)
 * whitelist + the fast-follow write-time gate, is deliberately deferred. Here we use a conservative
 * content-only allowlist and SKIP volume/machine kinds — enough to prove "the journal learns of a manual
 * edit" without pretending the eligibility policy is solved.
 */
const FILE_FIRST_KINDS = new Set(['note', 'agent', 'thought', 'summary', 'group']);

/** A file whose on-disk content hash diverges from the engine's last-known snapshot (staleness marker). */
export interface FileFirstStale {
  /** The node id (natural key / source_ref). */
  id: string;
  /** The last snapshot hash the journal knows for this id, or null if never ingested. */
  knownHash: string | null;
  /** The hash of the file's CURRENT on-disk content — what a hand-edit changed it to. */
  fileHash: string;
  /** Always true: this entry exists because file ≠ known. The read-model is STALE vs the file. */
  stale: true;
  /** Provenance source marker: the drift originates from an external, author-primary file. */
  source: typeof FILE_FIRST_SOURCE;
}

export class MdEnvelopeStore {
  private readonly inner: FileNodeStore;
  /**
   * source_ref → last-known content hash (the engine's memory of what it last ingested from each file).
   * This is the "last known snapshot" file-first diffs against (ADR-0006 §(f)). It is seeded from the
   * durable journal via `primeFromActs()` (the journal is the system-of-record; MdEnvelopeStore does NOT
   * own it) and advanced by each `ingest()`. In-process only for this slice.
   *
   * ⚠️ DESIGN FORK: durably persisting this cursor ACROSS process boundaries (frontmatter `meta.snapshotHash`
   * sidecar vs re-deriving from the journal each boot) is not decided — returned to owner. Re-deriving from
   * the journal (`primeFromActs`) is the seam we lean on so no second source of truth is introduced.
   */
  private readonly knownHashes = new Map<string, string>();

  constructor(root: string) {
    this.inner = new FileNodeStore(root);
  }

  /** Stable content hash of a file's authored body (the diff discriminant for file-first ingest). */
  private static hashContent(content: string): string {
    return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
  }

  /** Is this @ff/core node a hand-authored file-first content node (vs an engine carrier or a machine kind)? */
  private static isFileFirst(kind: string, meta: Record<string, unknown> | undefined): boolean {
    // Engine carriers (envelope/act JSON blobs written by writeNode/writeAct) are NOT author-primary
    // files — they are the engine's own projection/write-model on disk. Excluding them keeps file-first
    // ingest to genuinely human-edited md, and avoids double-counting carriers as "hand edits".
    if (meta && (meta.carrier === NODE_CARRIER_MARK || meta.carrier === ACT_CARRIER_MARK)) return false;
    return FILE_FIRST_KINDS.has(kind);
  }

  /**
   * Seed the last-known-snapshot cursor from a durable journal (the system-of-record). Takes the freshest
   * file-first `snapshotHash` per source_ref. Call once on boot before `ingest()`/`detectStale()` so a
   * restart does not re-emit an act for a file that was already ingested in a prior turn.
   */
  primeFromActs(acts: readonly Act[]): void {
    for (const act of acts) {
      const p = act.provenance;
      if (p === null || typeof p !== 'object') continue;
      const prov = p as Provenance;
      if (prov.source !== FILE_FIRST_SOURCE) continue;
      if (typeof prov.source_ref === 'string' && typeof prov.snapshotHash === 'string') {
        this.knownHashes.set(prov.source_ref, prov.snapshotHash);
      }
    }
  }

  /**
   * STALENESS DETECT (ADR-0006 §(e)/§(f)) — read every file-first md file and report the ones whose current
   * on-disk content hash diverges from the engine's last-known snapshot. A non-empty result means the
   * read-model / journal is BEHIND a hand-edited file: the graph must NOT be presented as fresh truth
   * (I-5) — it carries this staleness marker until `ingest()` folds the edit in. This is the "do not stay
   * silent when a manual edit is not yet reflected" requirement made observable.
   */
  async detectStale(): Promise<FileFirstStale[]> {
    const nodes = await this.inner.list();
    const stale: FileFirstStale[] = [];
    for (const n of nodes) {
      if (!MdEnvelopeStore.isFileFirst(n.kind, n.meta as Record<string, unknown> | undefined)) continue;
      const fileHash = MdEnvelopeStore.hashContent(n.body);
      const knownHash = this.knownHashes.get(n.id) ?? null;
      if (knownHash !== fileHash) {
        stale.push({ id: n.id, knownHash, fileHash, stale: true, source: FILE_FIRST_SOURCE });
      }
    }
    return stale;
  }

  /**
   * FILE-FIRST INGEST (ADR-0006 §(f), the engine as "first READER not first writer") — the EXPLICIT,
   * on-demand operation that turns a hand-edited file into journal truth. It is NOT a live fs-watcher:
   * WHEN it runs (git-hook · watcher · manual · CI) is a separate node and a DESIGN FORK returned to owner.
   *
   * For each file-first file whose content diverges from the last-known snapshot, it PRODUCES a file-first
   * act (a `domain_event`, so the projection reflects the file — see below) carrying the new content and a
   * `source: 'file-first'` provenance marker, then advances the snapshot cursor. The acts are RETURNED, not
   * persisted here — the caller appends them to the durable journal (the system-of-record it owns). This is
   * how "правишь .md руками → журнал узнаёт": the returned acts ARE the journal learning of the edit.
   *
   * ⚠️ DESIGN FORKs (NOT decided — returned to owner):
   *  - Act KIND. `domain_event` is chosen so the shared reducer folds the new content into current-state
   *    (`observation` would be a side-journal the graph never sees — it could not satisfy "проекция видит
   *    новое содержимое"). ADR-0006 §(f) named `file_edit`/`observation` loosely; `ACT_KINDS` has no
   *    `file_edit` and is frozen-shape (out of this slice's file bounds). If the owner wants a distinct
   *    file-edit kind, that is an additive `types.ts` change — flagged, not taken.
   *  - The MAPPING of arbitrary authored md → typed envelope fields is TODO(M3): the store-port ↔ @ff/core
   *    seam. Here we carry the authored body verbatim under `payload.content` (+ title, + kind→type). We do
   *    NOT invent the semantic reconciliation of prose → the 10-field envelope.
   *  - `recordedAt` is stamped at ingest time (when the engine OBSERVED the file). In the full build the
   *    `engine.write()` path is the immutable assigner; a file-first producer feeding through the engine
   *    instead of self-stamping is the cleaner seam — flagged.
   */
  async ingest(opts: { actor?: SubjectRef } = {}): Promise<Act[]> {
    const actor = opts.actor ?? 'engine:file-ingest';
    const nodes = await this.inner.list();
    const produced: Act[] = [];
    for (const n of nodes) {
      if (!MdEnvelopeStore.isFileFirst(n.kind, n.meta as Record<string, unknown> | undefined)) continue;
      const fileHash = MdEnvelopeStore.hashContent(n.body);
      if (this.knownHashes.get(n.id) === fileHash) continue; // unchanged since last ingest → no act

      const provenance: Provenance = {
        source_ref: n.id, // natural key: one graph node per file
        snapshotHash: fileHash, // idempotency discriminant: same ref+hash ⇒ dedup no-op
        source: FILE_FIRST_SOURCE, // marker: this act was DERIVED from an author-primary external file
      };
      const act: Act = {
        id: `act:file-first:${n.id}:${fileHash.slice(-12)}`,
        actor,
        provenance,
        recordedAt: new Date().toISOString(), // engine observed the file at this instant (see fork above)
        actKind: 'domain_event', // folds into current-state so the projection reflects the file
        edges: [],
        // Reserved `type` sets the projected node's type; `title`/`content` become body fields (freshest
        // wins). The authored md body rides verbatim in `content` — the semantic parse is TODO(M3).
        payload: { type: n.kind, title: n.title, content: n.body },
      };
      produced.push(act);
      this.knownHashes.set(n.id, fileHash); // advance the cursor: this snapshot is now "known"
    }
    return produced;
  }

  /**
   * Persist an EnvelopeNode as an @ff/core carrier node (delegated fs/frontmatter/validation).
   *
   * NOTE (CQRS): the canonical act→node projection now lives in the StorePort read-model
   * (store-memory + core/projection) — nodes are DERIVED from the log, not written directly. This
   * method is the disk-carrier writer for the async @ff/core bridge (exercised by the round-trip
   * test); durable persistence of the *projected* graph on the md path is the M3 seam (TODO below).
   */
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
