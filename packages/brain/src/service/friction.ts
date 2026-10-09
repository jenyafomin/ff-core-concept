// @ff/brain/service/friction — body-less friction records (SPEC R-4, R-7; V7): code + hash (+ verb, count),
// NEVER the request body. Deterministic id per (code, hash) → the same signal never makes a second record:
//   mode 'once'  — BAD_LINE: written once ever (2 restarts over the same bad line → still 1 record, AC-15);
//   mode 'count' — refusals: an existing record gets `count+1`.
// Capped at LIMITS.frictionPerDay writes per UTC day. MUST be called from inside the write queue.
//
// The hash is rendered in letters a–p (hex nibble → letter): a hex digest carries digit runs the engine's
// phone heuristic would refuse (admission.ts PHONE_RE), and a friction record must never be refused.
import { createHash, createHmac } from 'node:crypto';

import type { Engine, StorePort } from '@ff/engine';

import { LIMITS, type BrainVerb, type ClockPort, type FrictionCode, type RandomPort } from '../contract.js';
import { K } from '../domain/genesis.js';
import { newActId } from '../domain/ids.js';
import { READABLE_OWNER } from '../domain/pii-scope.js';
import type { Registry } from '../domain/registry.js';
import { buildRecordAct, decodeNode, type StoredMeta } from '../domain/to-act.js';

/** Principal stamped on service-written acts (friction). */
export const SERVICE_ACTOR = 'system:brain';

const LETTERS = 'abcdefghijklmnop';

function toLetters(hex: string, len: number): string {
  let out = '';
  for (let i = 0; i < len && i < hex.length; i++) out += LETTERS[parseInt(hex[i]!, 16)];
  return out;
}

/** sha256 of `s` rendered as letters a–p, truncated to `len`. Only for ids over ALREADY-keyed input. */
export function letterHash(s: string | Buffer, len = 20): string {
  return toLetters(createHash('sha256').update(s).digest('hex'), len);
}

/**
 * HMAC-SHA256(secret, s) rendered as letters a–p (W3): deterministic per brain home, but a short/low-entropy
 * input (a phone in `type`, a one-field note) can no longer be dictionary-reversed from a friction record
 * without the service secret. Letters, not hex — no digit runs for the engine's phone heuristic.
 */
export function keyedLetterHash(secret: string, s: string | Buffer, len = 20): string {
  return toLetters(createHmac('sha256', secret).update(s).digest('hex'), len);
}

/** Deterministic record id of a friction signal. */
export const frictionId = (code: string, hash: string): string => `u_f${letterHash(`${code}|${hash}`, 20)}`;

export interface FrictionSignalIn {
  code: FrictionCode;
  /** Already a letter hash (see letterHash). */
  hash: string;
  verb?: BrainVerb | 'replay' | 'outbox' | 'http';
}

export interface FrictionDeps {
  engine: Pick<Engine, 'write'>;
  store: Pick<StorePort, 'readNode'>;
  registry: Registry;
  clock: ClockPort;
  random: RandomPort;
  perDay?: number;
}

export class FrictionWriter {
  private day = '';
  private writtenToday = 0;
  /** Writes refused by the daily cap (visible in logs/tests). */
  dropped = 0;

  constructor(private readonly deps: FrictionDeps) {}

  /** Returns true when an act was written. Never throws (friction must not break the caller). */
  write(sig: FrictionSignalIn, mode: 'once' | 'count' = 'count'): boolean {
    try {
      const now = this.deps.clock.now();
      const day = now.toISOString().slice(0, 10);
      if (day !== this.day) {
        this.day = day;
        this.writtenToday = 0;
      }
      const id = frictionId(sig.code, sig.hash);
      const existing = this.deps.store.readNode(id);
      if (existing && mode === 'once') return false;
      if (this.writtenToday >= (this.deps.perDay ?? LIMITS.frictionPerDay)) {
        this.dropped += 1;
        return false;
      }
      const prev = existing ? decodeNode(existing) : null;
      const prevCount = typeof prev?.fields.count === 'number' ? prev.fields.count : 0;
      const iso = now.toISOString();
      const typeV = this.deps.registry.type(K.types.friction)?.version ?? 1;
      const meta: StoredMeta = {
        status: 'active',
        visibility: 'owner',
        author: SERVICE_ACTOR,
        created_at: prev?.meta.created_at || iso,
        updated_at: iso,
        type_v: typeV,
        pinned: false,
        temperature: 'hot',
      };
      const fields: Record<string, unknown> = { code: sig.code, hash: sig.hash, count: prevCount + 1, status: 'open' };
      if (sig.verb) fields.verb = sig.verb;
      const act = buildRecordAct({
        id,
        actId: newActId(this.deps.clock, this.deps.random),
        actor: SERVICE_ACTOR,
        type: K.types.friction,
        type_v: typeV,
        label: `friction ${sig.code}`,
        fields,
        meta,
        readable_by: READABLE_OWNER,
        edges: [],
        now,
      });
      const ack = this.deps.engine.write(act);
      if (!ack.ok) return false;
      this.writtenToday += 1;
      return true;
    } catch {
      return false;
    }
  }
}
