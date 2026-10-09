// @ff/brain/domain/ids — record and act ids (R-2): `u_<ts36><rand>` (forever, no project/type — D2) and
// `a_<ts36><rand>`. Clock and randomness are injected (ClockPort/RandomPort) so tests are deterministic.
import { createHash, randomBytes } from 'node:crypto';

import { PATTERNS, type ClockPort, type RandomPort } from '../contract.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export const systemClock: ClockPort = { now: () => new Date() };

export const cryptoRandom: RandomPort = {
  suffix(len: number): string {
    const bytes = randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % 36];
    return out;
  },
};

const RAND_LEN = 6;

export function newUnitId(clock: ClockPort = systemClock, random: RandomPort = cryptoRandom): string {
  return `u_${clock.now().getTime().toString(36)}${random.suffix(RAND_LEN)}`;
}

export function newActId(clock: ClockPort = systemClock, random: RandomPort = cryptoRandom): string {
  return `a_${clock.now().getTime().toString(36)}${random.suffix(RAND_LEN)}`;
}

/** Deterministic act id for a seeded (genesis) act — same source_ref → same id. */
export function seededActId(sourceRef: string): string {
  const hex = createHash('sha256').update(sourceRef).digest('hex').slice(0, 12);
  return `a_g${BigInt(`0x${hex}`).toString(36)}`;
}

export const isUnitId = (s: unknown): s is string => typeof s === 'string' && PATTERNS.unitId.test(s);
export const isActId = (s: unknown): s is string => typeof s === 'string' && PATTERNS.actId.test(s);

/** sha256 hex — used for friction hashes (code + hash only, never a body — V7). */
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** A deterministic counter-based RandomPort for tests (`000001`, `000002`, …). */
export function sequentialRandom(start = 0): RandomPort {
  let n = start;
  return {
    suffix(len: number): string {
      n += 1;
      return n.toString(36).padStart(len, '0').slice(-len);
    },
  };
}
