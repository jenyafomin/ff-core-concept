import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BRAIN_ROUTES,
  BRAIN_VERBS,
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  IDENTITY_KEYS,
  LIMITS,
  PATTERNS,
  RECEIPT_ID_TAIL,
  RESERVED_BODY_KEYS,
  formatReceipt,
  type ReadersFile,
  type RecordRequest,
} from '../src/contract.js';
import { makeBrainFixture, OWNER_ID, THREAD_BRAIN, type BrainFixture } from './support/brain-fixture.js';

const here = dirname(fileURLToPath(import.meta.url));
const contractSrc = readFileSync(join(here, '../src/contract.ts'), 'utf8');

describe('contract: error codes', () => {
  it('codes are unique and every code has an HTTP status', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    for (const code of ERROR_CODES) expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    expect(Object.keys(ERROR_HTTP_STATUS).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('carries every code named by ADR-0016 / SPEC v0.6', () => {
    for (const named of [
      'DEFAULT_DENY',
      'SENDER_DENIED',
      'SCOPE_DENIED',
      'RESERVED_FIELD',
      'PII_REFUSED',
      'SOURCE_REF_INVALID',
      'DERIVED_FROM_INVALID',
      'UNKNOWN_PREDICATE',
      'CONFLICT',
      'SERVICE_DOWN',
      'LABEL_REQUIRED',
    ]) {
      expect(ERROR_CODES).toContain(named);
    }
    expect(ERROR_HTTP_STATUS.DEFAULT_DENY).toBe(403); // AC-01
    expect(ERROR_HTTP_STATUS.UNAUTHORIZED).toBe(401); // AC-23
    expect(ERROR_HTTP_STATUS.IDENTITY_FIELD).toBe(400); // AC-06
  });
});

describe('contract: request shape', () => {
  it('reserved and identity keys match the SPEC (AC-06, AC-34)', () => {
    expect([...RESERVED_BODY_KEYS].sort()).toEqual(['capability', 'readable_by', 'space', 'tenant']);
    for (const k of ['conversationId', 'author', 'principal', 'sender']) expect(IDENTITY_KEYS).toContain(k);
  });

  it('RecordRequest has no identity field (compile-time + source check, AC-06)', () => {
    const req: RecordRequest = { type: 'x', label: 'y' };
    // @ts-expect-error — identity is never part of a request body
    const bad: RecordRequest = { ...req, conversationId: 'c' };
    expect(bad).toBeTruthy();
    const recordBlock = contractSrc.slice(
      contractSrc.indexOf('export interface RecordRequest'),
      contractSrc.indexOf('export interface DedupCandidate'),
    );
    for (const k of IDENTITY_KEYS) expect(recordBlock).not.toMatch(new RegExp(`^\\s+${k}\\??:`, 'm'));
  });

  it('format patterns follow R-9 (AC-33)', () => {
    expect(PATTERNS.derivedFrom.test('u_k3x9abc@3')).toBe(true);
    expect(PATTERNS.derivedFrom.test('u_k3x9abc')).toBe(false);
    expect(PATTERNS.sourceRef.test('docs/a.md#L3')).toBe(true);
    expect(PATTERNS.sourceRef.test('me@x.com')).toBe(false);
    expect(PATTERNS.sourceRefDigitRun.test('order/123456789')).toBe(true);
  });

  it('routes cover the 4 verbs + health/stats/export over /v1 (R-5)', () => {
    for (const v of BRAIN_VERBS) expect(BRAIN_ROUTES[v]).toEqual({ method: 'POST', path: `/v1/${v}` });
    expect(BRAIN_ROUTES.health.method).toBe('GET');
    expect(LIMITS.readDepthMax).toBe(2);
    expect(LIMITS.findLimitMax).toBe(50);
  });
});

describe('contract: receipt', () => {
  it('is server-built and shows only the id tail (AC-28)', () => {
    const r = formatReceipt({ label: 'Подключить devops 443', scope: 'brain', type: 'x', status: 'active', id: 'u_abcdef123456' });
    expect(r).toBe('Записано: Подключить devops 443 → brain · x/active · #123456');
    expect(RECEIPT_ID_TAIL).toBe(6);
  });
});

describe('contract: AC-14 hygiene', () => {
  it('contract.ts has no imports (byte-copied into @ff/brain-mcp)', () => {
    expect(contractSrc).not.toMatch(/^\s*import\s/m);
  });

  it('contract.ts names no genesis types/predicates and never calls the view compiler', () => {
    expect(contractSrc).not.toMatch(/'(task|decision|note|person|in-scope|member-of)'/);
    expect(contractSrc).not.toMatch(/\.view\(/);
  });
});

describe('brain fixture', () => {
  let fx: BrainFixture | undefined;
  afterEach(() => fx?.cleanup());

  it('builds an isolated home with a 0600 readers.json shaped like the real allowlist', () => {
    fx = makeBrainFixture();
    expect(fx.home).not.toContain('.ff-brain/');
    expect(existsSync(fx.storeDir)).toBe(true);
    const readers = JSON.parse(readFileSync(fx.readersPath, 'utf8')) as ReadersFile;
    expect(readers.owner_id).toBe(OWNER_ID);
    expect(readers.chats[THREAD_BRAIN]?.default_scope).toBeDefined();
    expect(statSync(fx.readersPath).mode & 0o777).toBe(0o600);
  });
});
