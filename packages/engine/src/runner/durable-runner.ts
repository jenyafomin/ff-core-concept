/**
 * durable-runner — the SPINE seam (P2): a restart-surviving runner that binds the Engine onto the durable
 * on-disk store, so "boot the brain" and "record a fact" become ONE reusable pipeline component instead of
 * ad-hoc wiring repeated in each surface (cli.ts, the gateway turn, a future HTTP caller).
 *
 * WHY THIS EXISTS: DurableFsStore proved a durable journal, and Engine proved admit→dedup→project, but
 * nothing TIED them as a conveyor a caller can restart. Under the gateway's "each turn = a fresh process",
 * the spine must: boot the Engine from the durable journal, accept records (idempotent by the R5 KERNEL
 * hash — see core/idempotency.ts), and survive a restart — re-instantiating the store over the SAME
 * store-dir rebuilds the exact prior read-model from disk.
 *
 * `restart()` models that turn boundary WITHOUT spawning a new OS process: it releases the single-writer
 * lock (store.close()) and re-boots a fresh store+engine over the same dir, re-folding the journal from
 * disk. (The genuine cross-process boundary is separately sealed by survive-turn.test / cli-durable.test;
 * this runner is the composition layer those surfaces will consume.)
 */
import { DurableFsStore } from '../adapters/store-durable-fs.js';
import { FIXED_POLICY, type PermissionPolicy } from '../core/resolve.js';
import { Engine } from '../engine.js';
import type { ActSchema, HomeRegistry } from '../core/admission.js';
import type { Act, EnvelopeNode, PredicateRegistry, SubjectRef, ViewDef } from '../core/types.js';
import type { ViewResult } from '../core/view-compiler.js';
import type { Ack } from '../ports/engine-client.js';

export interface DurableRunnerOptions {
  /** The on-disk store directory (holds journal.jsonl + the single-writer lock). */
  storeDir: string;
  /**
   * Substrate supplied on EVERY boot (seed corpus). MUST include `policy:constitution` — the Engine
   * refuses to start without the policy ceiling. Not persisted in the journal (base is loader-supplied).
   */
  base?: EnvelopeNode[];
  policy?: PermissionPolicy;
  schemas?: ActSchema[];
  homeRegistry?: HomeRegistry;
  registry?: PredicateRegistry;
}

export class DurableRunner {
  private store!: DurableFsStore;
  private engine!: Engine;

  constructor(private readonly opts: DurableRunnerOptions) {
    this.boot();
  }

  /** (Re-)construct the durable store + Engine over the store-dir, rebuilding the read-model from disk. */
  private boot(): void {
    this.store = new DurableFsStore(this.opts.storeDir, this.opts.base ?? [], this.opts.registry ?? {});
    this.engine = new Engine(
      this.store,
      this.opts.policy ?? FIXED_POLICY,
      this.opts.schemas ?? [],
      this.opts.homeRegistry,
    );
  }

  /** Record a fact through the full admit→dedup→project pipeline (idempotent by the R5 kernel hash). */
  record(act: Act): Ack {
    return this.engine.write(act);
  }

  /** Read a projected node off the durable read-model (null if absent / not yet visible). */
  read(id: string): EnvelopeNode | null {
    return this.store.readNode(id);
  }

  /** Run a compiled view for a viewer (all reads gated by resolve()). */
  view(def: ViewDef, viewer: SubjectRef): ViewResult {
    return this.engine.view(def, viewer);
  }

  /** The durable append-only journal (write-model reader). */
  acts(): readonly Act[] {
    return this.store.acts();
  }

  /**
   * Simulate a process restart on the SAME durable store-dir: release the single-writer lock, then re-boot
   * a fresh store+engine that rebuilds its read-model from the on-disk journal. State is restored; a repeat
   * `record()` after restart is still idempotent — the R5 hash is matched against the DISK journal.
   */
  restart(): void {
    this.store.close();
    this.boot();
  }

  /** Release the single-writer lock (call when done so the next boot can take it). Idempotent. */
  close(): void {
    this.store.close();
  }
}
