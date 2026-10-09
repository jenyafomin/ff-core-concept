// @ff/brain/service/runtime — the brain service core (SPEC R-4, R-5, R-7, R-8): boot sequence + the
// BrainPort verbs. Transport-free (http.ts wraps it); tests may call it directly.
//
// Boot (all before the first request):
//   ensureHome → preflightLock (live foreign writer → BrainLockError, file untouched) → repairTornTail
//   (backup copy → truncate to last `\n`) → bootBrain (two-pass; bad lines skipped + collected) →
//   idem index from the journal → [queue] one BAD_LINE friction per distinct bad line (deterministic id)
//   → [queue] start backup → timers (15-min-if-changed, nightly).
//
// Every write (record, link, friction, backup) runs inside ONE WriteQueue. `ok:true` is returned only after
// Engine.write → DurableFsStore.writeAct returned (appended + fsync'd, AC-17).
import { chmodSync, existsSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { sourceRefOf } from '@ff/engine';

import {
  CONTRACT_VERSION,
  LIMITS,
  formatReceipt,
  type BrainError,
  type BrainErrorCode,
  type BrainPort,
  type BrainResult,
  type BrainVerb,
  type CallerContext,
  type ClockPort,
  type ExportRequest,
  type ExportResponse,
  type FindRequest,
  type FindResponse,
  type HealthResponse,
  type LinkRequest,
  type LinkResponse,
  type RandomPort,
  type ReadRequest,
  type ReadResponse,
  type Reader,
  type RecordRequest,
  type RecordResponse,
  type StatsResponse,
} from '../contract.js';
import type { ScopeSeed } from '../domain/genesis.js';
import { cryptoRandom, systemClock } from '../domain/ids.js';
import { bootBrain, type BrainDomain } from '../domain/schemas.js';
import { brainError, commitRecord, engineRefusalToError } from '../domain/to-act.js';
import { planLink, planRecord, targetMissingFor, type DomainContext } from '../domain/validate-act.js';
import { createReadGate, createReaderResolver, isRecordNode, type ReadDeps } from '../read/access.js';
import { find as findVerb } from '../read/find.js';
import { read as readVerb } from '../read/read.js';

import { ensureSecret } from './auth.js';
import { BackupManager, msUntilHour } from './backup.js';
import { FrictionWriter, keyedLetterHash, type FrictionSignalIn } from './friction.js';
import { LatencyTracker, RateLimiter } from './health.js';
import { idemBodyMismatch, idemKey, idemStamp, IdemIndex, type IdemAnswer } from './idem.js';
import { lineAt, preflightLock, repairTornTail, type TornTailRepair } from './journal.js';
import { ensureHome, homePaths, readServiceConfig, type BrainHomePaths, type ServiceConfig } from './paths.js';
import { WriteQueue } from './queue.js';
import { readersLoader } from './readers.js';
import { recordReceipt, scopesLabelOf } from './receipt.js';
import { exportRecords, stats as statsOf } from './stats.js';

export interface BrainServiceOptions {
  /** Brain home (`~/.ff-brain` or FF_BRAIN_HOME). */
  home: string;
  clock?: ClockPort;
  random?: RandomPort;
  /** Genesis scopes; overrides `service.json.scopes`. */
  scopes?: ScopeSeed[];
  /** Writes (record+link) per dialog per minute. Default LIMITS.recordsPerMinutePerConversation. */
  rateLimitPerMinute?: number;
  /** Default LIMITS.backupEveryActs. */
  backupEveryActs?: number;
  /** Changed-journal backup timer; 0 disables. Default LIMITS.backupEveryMs. */
  backupEveryMs?: number;
  /** Nightly backup timer. Default true. */
  nightlyBackup?: boolean;
  /** Friction writes per UTC day. Default LIMITS.frictionPerDay. */
  frictionPerDay?: number;
  log?: (line: string) => void;
}

export interface BadLineSeen {
  lineNo: number;
  reason: string;
  /** Letter-hash of (line bytes hash, reason) — the friction dedup key. */
  hash: string;
}

const isError = (r: unknown): r is BrainError => !!r && typeof r === 'object' && (r as { ok?: unknown }).ok === false;

export class BrainService implements BrainPort {
  readonly paths: BrainHomePaths;
  readonly config: ServiceConfig;
  readonly queue = new WriteQueue();
  readonly latency = new LatencyTracker();
  readonly startedAt: Date;
  readonly tornTail: TornTailRepair | null;
  readonly badLines: BadLineSeen[];
  /** Resolves when the boot tasks (bad-line friction, start backup) are done. */
  readonly ready: Promise<void>;

  private readonly domain: BrainDomain;
  private readonly clock: ClockPort;
  private readonly random: RandomPort;
  private readonly resolver: ReturnType<typeof createReaderResolver>;
  private readonly idem: IdemIndex;
  private readonly friction: FrictionWriter;
  private readonly backup: BackupManager;
  private readonly rate: RateLimiter;
  private readonly backupEveryActs: number;
  private readonly log: (line: string) => void;
  /** HMAC key of every body-less hash (W3). */
  private readonly secret: string;
  private actsAtBackup = 0;
  private timers: NodeJS.Timeout[] = [];
  private closed = false;

  private constructor(opts: BrainServiceOptions) {
    this.clock = opts.clock ?? systemClock;
    this.random = opts.random ?? cryptoRandom;
    this.log = opts.log ?? (() => {});
    this.paths = homePaths(opts.home);
    ensureHome(this.paths);
    this.secret = ensureSecret(this.paths.secret);
    this.config = readServiceConfig(this.paths.service);

    preflightLock(this.paths.lock, this.paths.journal);
    this.tornTail = repairTornTail(this.paths.journal, this.paths.backups, this.clock);
    if (this.tornTail) {
      this.log(`journal torn tail: ${this.tornTail.removedBytes} bytes cut, copy at ${this.tornTail.backupPath}`);
    }

    const rawBad: Array<{ lineNo: number; reason: string; byteOffset: number }> = [];
    const scopes = opts.scopes ?? this.config.scopes;
    this.domain = bootBrain({
      storeDir: this.paths.storeDir,
      clock: this.clock,
      onBadLine: (info) => rawBad.push(info),
      ...(scopes ? { scopes } : {}),
    });
    this.startedAt = this.clock.now();
    if (existsSync(this.paths.journal)) chmodSync(this.paths.journal, 0o600); // the engine creates it 0644

    let buf: Buffer | null = null;
    this.badLines = rawBad.map((b) => {
      buf ??= readFileSync(this.paths.journal);
      const lineHash = keyedLetterHash(this.secret, lineAt(buf, b.byteOffset));
      return { lineNo: b.lineNo, reason: b.reason, hash: keyedLetterHash(this.secret, `${lineHash}|${b.reason}`) };
    });
    if (this.badLines.length) this.log(`journal: ${this.badLines.length} bad line(s) skipped`);

    this.resolver = createReaderResolver(readersLoader(this.paths.readers, this.log));
    this.idem = IdemIndex.fromJournal(this.domain.store);
    this.friction = new FrictionWriter({
      engine: this.domain.engine,
      store: this.domain.store,
      registry: this.domain.registry,
      clock: this.clock,
      random: this.random,
      ...(opts.frictionPerDay !== undefined ? { perDay: opts.frictionPerDay } : {}),
    });
    this.backup = new BackupManager({
      journalPath: this.paths.journal,
      dir: this.paths.backups,
      clock: this.clock,
      ...(this.config.backup_mirror ? { mirror: this.config.backup_mirror } : {}),
    });
    this.rate = new RateLimiter(opts.rateLimitPerMinute ?? LIMITS.recordsPerMinutePerConversation);
    this.backupEveryActs = opts.backupEveryActs ?? LIMITS.backupEveryActs;

    const bad = this.badLines;
    this.ready = this.queue
      .run(() => {
        for (const b of bad) this.friction.write({ code: 'BAD_LINE', hash: b.hash, verb: 'replay' }, 'once');
        this.runBackup();
      })
      .catch((e) => this.log(`boot tasks failed: ${(e as Error).message}`));

    const every = opts.backupEveryMs ?? LIMITS.backupEveryMs;
    if (every > 0) {
      const t = setInterval(() => {
        if (this.domain.store.acts().length !== this.actsAtBackup) void this.queue.run(() => this.runBackup());
      }, every);
      t.unref();
      this.timers.push(t);
    }
    if (opts.nightlyBackup !== false) this.scheduleNightly();
  }

  /** Boot the service (throws BrainLockError / DurableStoreError if another instance runs). */
  static open(opts: BrainServiceOptions): BrainService {
    return new BrainService(opts);
  }

  // ─── verbs ────────────────────────────────────────────────────────────────────────────────────────

  async record(caller: CallerContext, req: RecordRequest): Promise<BrainResult<RecordResponse>> {
    const reader = await this.reader(caller, 'record', req);
    if (isError(reader)) return reader;
    return this.write('record', caller, reader, req, (idem) => {
      const plan = planRecord(req, reader, this.ctx(reader), idem ? { idem } : {});
      if (isError(plan)) return plan;
      const res = commitRecord({ engine: this.domain.engine, store: this.domain.store }, plan);
      if (!res.ok) return res;
      for (const f of plan.friction) this.friction.write({ code: f.code, hash: keyedLetterHash(this.secret, f.hash), verb: 'record' });
      const payload = plan.act.payload;
      // F-7/F-8: the receipt the owner reads — the task's own status, every scope (same builder as idem replay)
      return payload && typeof payload === 'object'
        ? { ...res, receipt: recordReceipt(payload as Record<string, unknown>, res.id, res.type, this.domain.store, new Set(reader.scopes)) }
        : res;
    });
  }

  async link(caller: CallerContext, req: LinkRequest): Promise<BrainResult<LinkResponse>> {
    const reader = await this.reader(caller, 'link', req);
    if (isError(reader)) return reader;
    return this.write('link', caller, reader, req, (idem) => {
      const plan = planLink(req, reader, this.ctx(reader), idem ? { idem } : {});
      if (isError(plan)) return plan;
      const ack = this.domain.engine.write(plan.act);
      if (!ack.ok) return engineRefusalToError(ack.reason);
      return {
        ok: true,
        edge_id: plan.edge_id,
        dangling: plan.dangling,
        receipt: formatReceipt({ label: plan.label, scope: this.linkScopes(plan, reader), type: plan.type, status: plan.status, id: plan.edge_id }),
      } satisfies LinkResponse;
    });
  }

  async find(caller: CallerContext, req: FindRequest): Promise<BrainResult<FindResponse>> {
    const reader = await this.reader(caller, 'find', req);
    if (isError(reader)) return reader;
    return this.readPath('find', req, () => findVerb(reader, req, this.readDeps()));
  }

  async read(caller: CallerContext, req: ReadRequest): Promise<BrainResult<ReadResponse>> {
    const reader = await this.reader(caller, 'read', req);
    if (isError(reader)) return reader;
    return this.readPath('read', req, () => readVerb(reader, req, this.readDeps()));
  }

  async stats(caller: CallerContext): Promise<BrainResult<StatsResponse>> {
    const reader = await this.reader(caller, 'http', {});
    if (isError(reader)) return reader;
    return statsOf(reader, this.readDeps());
  }

  async export(caller: CallerContext, req: ExportRequest): Promise<BrainResult<ExportResponse>> {
    const reader = await this.reader(caller, 'http', req);
    if (isError(reader)) return reader;
    if (req.scopes !== undefined && (!Array.isArray(req.scopes) || !req.scopes.every((s) => typeof s === 'string'))) {
      return brainError('BAD_REQUEST', 'scopes must be a list of slugs/ids');
    }
    return exportRecords(reader, req, { ...this.readDeps(), exportDir: this.paths.export, now: this.clock.now() });
  }

  async health(): Promise<HealthResponse> {
    const store = this.domain.store;
    let records = 0;
    for (const n of store.load()) if (isRecordNode(n)) records += 1;
    const now = this.clock.now();
    return {
      ok: true,
      contract: CONTRACT_VERSION,
      started_at: this.startedAt.toISOString(),
      uptime_s: Math.max(0, Math.round((now.getTime() - this.startedAt.getTime()) / 1000)),
      acts: store.acts().length,
      records,
      bad_lines: store.badLineCount,
      write_p95_ms: this.latency.percentile(95),
      queue_depth: this.queue.depth,
      last_backup_at: this.backup.lastAt,
    };
  }

  /** Refusal friction for transport-level errors (http.ts: IDENTITY_FIELD, BAD_REQUEST …). */
  reportRefusal(code: BrainErrorCode, verb: FrictionSignalIn['verb'], args: unknown): Promise<void> {
    return this.queue.run(() => {
      this.friction.write({ code, hash: argsHash(args, this.secret), ...(verb ? { verb } : {}) });
    });
  }

  /** Force a backup now (queued). */
  backupNow(): Promise<ReturnType<BackupManager['run']>> {
    return this.queue.run(() => this.runBackup());
  }

  /** Stop timers, drain the queue, release the journal lock. Idempotent. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    await this.queue.idle().catch(() => undefined);
    this.domain.store.close();
  }

  /** Synchronous lock release for signal handlers / process exit. */
  closeSync(): void {
    this.closed = true;
    for (const t of this.timers) clearTimeout(t);
    this.domain.store.close();
  }

  /** Test/ops access to the underlying domain (store/engine/registry). */
  get brain(): BrainDomain {
    return this.domain;
  }

  get frictionDropped(): number {
    return this.friction.dropped;
  }

  // ─── internals ────────────────────────────────────────────────────────────────────────────────────

  /** Domain context for one reader: the real read gate (engine PEP ∧ scope gate) answers target visibility (F-2). */
  private ctx(reader: Reader): DomainContext {
    const gate = createReadGate(reader, this.readDeps());
    return {
      registry: this.domain.registry,
      lookup: (id) => this.domain.store.readNode(id),
      canSee: (node) => gate.canSee(node),
      clock: this.clock,
      random: this.random,
    };
  }

  /** F-8: every scope of the link's source record (falls back to the plan's single scope label). */
  private linkScopes(plan: { act: Parameters<typeof sourceRefOf>[0]; scopeLabel: string }, reader: Reader): string {
    const from = sourceRefOf(plan.act);
    return (typeof from === 'string' ? scopesLabelOf(from, this.domain.store, new Set(reader.scopes)) : '') || plan.scopeLabel;
  }

  private readDeps(): ReadDeps {
    return { engine: this.domain.engine, store: this.domain.store, clock: this.clock };
  }

  /** Resolve the reader from headers only; a refusal leaves one body-less friction. */
  private async reader(caller: CallerContext, verb: FrictionSignalIn['verb'], args: unknown): Promise<Reader | BrainError> {
    const r = this.resolver.resolve(caller);
    if (isError(r)) await this.reportRefusal(r.code, verb, args).catch(() => undefined);
    return r;
  }

  private async readPath<T extends { ok: true }>(verb: BrainVerb, req: unknown, run: () => BrainResult<T>): Promise<BrainResult<T>> {
    let res: BrainResult<T>;
    try {
      res = run();
    } catch (e) {
      this.log(`${verb} failed: ${(e as Error).message}`);
      res = brainError('INTERNAL', `${verb} failed`);
    }
    if (isError(res)) await this.reportRefusal(res.code, verb, req).catch(() => undefined);
    return res;
  }

  /**
   * The write path: [queue] idem → rate limit → plan+commit → idem index → backup trigger.
   * idem (R-8) is keyed server-side by dialog (W2) and remembers a keyed tag of the body (F-5).
   */
  private write<T extends RecordResponse | LinkResponse>(
    verb: 'record' | 'link',
    caller: CallerContext,
    reader: Reader,
    req: unknown,
    plan: (idem: string | undefined) => BrainResult<T>,
  ): Promise<BrainResult<T>> {
    return this.queue.run((): BrainResult<T> => {
      const fail = (e: BrainError): BrainError => {
        this.friction.write({ code: e.code, hash: argsHash(req, this.secret), verb });
        return e;
      };
      const idem = reader.idem && caller.idem ? idemKey(caller.conversation_id ?? `cli:${reader.key}`, caller.idem) : undefined;
      const bodyTag = idem ? argsHash(req, this.secret) : undefined;
      if (idem) {
        const prev = this.idem.get(idem);
        if (prev) {
          if (prev.verb !== verb) return fail(brainError('BAD_REQUEST', `idem already used for '${prev.verb}', not '${verb}'`));
          const ctx = this.ctx(reader);
          const dangling = (target: string) => targetMissingFor(reader, target, ctx);
          return replayAnswer(prev, prev.body !== undefined && prev.body !== bodyTag, new Set(reader.scopes), dangling) as T;
        }
      }
      if (!this.rate.take(rateKey(caller, reader), Date.now())) {
        return fail(brainError('RATE_LIMITED', `more than ${LIMITS.recordsPerMinutePerConversation} writes per minute in this dialog`));
      }
      const t0 = performance.now();
      let res: BrainResult<T>;
      try {
        res = plan(idem ? idemStamp(idem, bodyTag!) : undefined);
      } catch (e) {
        this.log(`${verb} failed: ${(e as Error).message}`);
        res = brainError('INTERNAL', `${verb} failed`);
      }
      if (isError(res)) return fail(res);
      this.latency.add(performance.now() - t0);
      if (idem) {
        if (verb === 'record') this.idem.set(idem, { verb, res: res as RecordResponse, body: bodyTag! });
        else this.idem.set(idem, { verb, res: res as LinkResponse, body: bodyTag!, target: (req as LinkRequest).to });
      }
      if (this.domain.store.acts().length - this.actsAtBackup >= this.backupEveryActs) this.runBackup();
      return res;
    });
  }

  /** MUST run inside the queue. */
  private runBackup(): ReturnType<BackupManager['run']> {
    try {
      const r = this.backup.run();
      this.actsAtBackup = this.domain.store.acts().length;
      return r;
    } catch (e) {
      this.log(`backup failed: ${(e as Error).message}`);
      return null;
    }
  }

  private scheduleNightly(): void {
    const hour = Number.isInteger(this.config.nightly_backup_hour) ? this.config.nightly_backup_hour! : 3;
    const t = setTimeout(() => {
      void this.queue.run(() => this.runBackup());
      if (!this.closed) this.scheduleNightly();
    }, msUntilHour(new Date(), hour));
    t.unref();
    this.timers.push(t);
  }
}

/** The original answer of a replayed idem; a different body adds IDEM_BODY_MISMATCH (F-5). */
function replayAnswer(
  prev: IdemAnswer,
  mismatch: boolean,
  visible: ReadonlySet<string>,
  danglingFor: (target: string) => boolean,
): RecordResponse | LinkResponse {
  const receipt = prev.render ? prev.render(visible) : prev.res.receipt;
  if (prev.verb === 'record') {
    const warnings = mismatch ? [...prev.res.warnings, idemBodyMismatch()] : prev.res.warnings;
    return { ...prev.res, receipt, dedup: true, warnings };
  }
  // F-2: `dangling` by the SAME rule as the domain (targetMissingFor) for the replaying reader
  const res = prev.target !== undefined ? { ...prev.res, receipt, dangling: danglingFor(prev.target) } : { ...prev.res, receipt };
  return mismatch ? { ...res, warnings: [...(prev.res.warnings ?? []), idemBodyMismatch()] } : res;
}

/** Body-less keyed hash of request args for friction / the idem body tag (V7: never the body; W3: HMAC). */
export function argsHash(args: unknown, secret: string): string {
  let s: string;
  try {
    s = JSON.stringify(args ?? null) ?? 'null';
  } catch {
    s = 'unserializable';
  }
  return keyedLetterHash(secret, s);
}

function rateKey(caller: CallerContext, reader: Reader): string {
  return caller.conversation_id ? `chat:${caller.conversation_id}` : `cli:${reader.key}`;
}

