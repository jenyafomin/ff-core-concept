// Shared harness for domain tests: a real DurableFsStore + Engine in a tmp brain home (no mocks).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

import type { Act } from '@ff/engine';

import type { BrainError, ClockPort, LinkRequest, Reader, RecordRequest, RecordResponse } from '../../src/contract.js';
import {
  bootBrain,
  commitRecord,
  decodeNode,
  planLink,
  planRecord,
  sequentialRandom,
  type BrainDomain,
  type DomainContext,
  type DomainRecord,
  type ScopeSeed,
} from '../../src/domain/index.js';
import { FIXED_NOW, makeBrainFixture, THREAD_BRAIN, type BrainFixture } from '../support/brain-fixture.js';

// every DurableFsStore registers a process 'exit' hook; many stores per test file is expected here
process.setMaxListeners(0);

export const SEED_SCOPES: ScopeSeed[] = [
  { slug: 'acme', name: 'Acme', kind: 'company' },
  { slug: 'brain', name: 'Мозг', kind: 'project', member_of: ['acme'] },
  { slug: 'agents', name: 'Агенты', kind: 'project', member_of: ['acme'] },
  { slug: 'personal', name: 'Личное', kind: 'personal' },
];

export function topicReader(over: Partial<Reader> = {}): Reader {
  return {
    kind: 'chat',
    key: THREAD_BRAIN,
    principal: 'user:owner',
    scopes: ['scope:brain', 'scope:agents', 'scope:personal'],
    default_scope: 'scope:brain',
    write: true,
    personal: true,
    idem: true,
    ...over,
  };
}

/** Monotonic clock starting at FIXED_NOW (+1s per call) → unique, deterministic timestamps. */
export function tickingClock(start = FIXED_NOW): ClockPort & { set(d: Date): void } {
  let t = start.getTime();
  return {
    now: () => new Date((t += 1000)),
    set: (d: Date) => {
      t = d.getTime();
    },
  };
}

export interface Brain {
  fx: BrainFixture;
  d: BrainDomain;
  clock: ReturnType<typeof tickingClock>;
  ctx(): DomainContext;
  record(req: RecordRequest, reader?: Reader): RecordResponse | BrainError;
  link(req: LinkRequest, reader?: Reader): { ok: true; edge_id: string; dangling: boolean } | BrainError;
  get(id: string): DomainRecord;
  acts(): readonly Act[];
  journal(): string;
  appendRaw(line: string): void;
  restart(): void;
  close(): void;
}

export function openBrain(opts: { scopes?: ScopeSeed[]; fx?: BrainFixture } = {}): Brain {
  const fx = opts.fx ?? makeBrainFixture();
  const clock = tickingClock();
  const random = sequentialRandom();
  const boot = () => bootBrain({ storeDir: fx.storeDir, scopes: opts.scopes ?? SEED_SCOPES, clock });
  let d = boot();
  const b: Brain = {
    fx,
    get d() {
      return d;
    },
    clock,
    ctx: () => ({ registry: d.registry, lookup: (id) => d.store.readNode(id), clock, random }),
    record(req, reader = topicReader()) {
      const plan = planRecord(req, reader, b.ctx());
      if ('ok' in plan) return plan;
      return commitRecord({ engine: d.engine, store: d.store }, plan) as RecordResponse | BrainError;
    },
    link(req, reader = topicReader()) {
      const plan = planLink(req, reader, b.ctx());
      if ('ok' in plan) return plan;
      const ack = d.engine.write(plan.act);
      if (!ack.ok) throw new Error(ack.reason);
      return { ok: true, edge_id: plan.edge_id, dangling: plan.dangling };
    },
    get(id) {
      const node = d.store.readNode(id);
      if (!node) throw new Error(`no node ${id}`);
      return decodeNode(node);
    },
    acts: () => d.store.acts(),
    journal: () => (existsSync(fx.journalPath) ? readFileSync(fx.journalPath, 'utf8') : ''),
    appendRaw(line) {
      appendFileSync(fx.journalPath, `${line}\n`);
    },
    restart() {
      d.store.close();
      d = boot();
    },
    close() {
      d.store.close();
      fx.cleanup();
    },
  } as Brain;
  return b;
}

export function ok<T extends { ok: true }>(r: T | BrainError): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${r.message}`);
  return r;
}

export function err(r: { ok: boolean } | BrainError): BrainError {
  if (r.ok) throw new Error(`expected an error, got ok: ${JSON.stringify(r)}`);
  return r as BrainError;
}
