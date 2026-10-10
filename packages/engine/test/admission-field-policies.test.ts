/**
 * R1 R-01 (SPEC-brain-r1-prompt-layers, AC-R09 engine side) — per-type field policies in admission:
 * `opaquePattern` lets a Telegram id (`-1004351636302`, `-1004351636302:56`) through the phone heuristic ONLY
 * for the declared key of the declared payload type; `verbatim` scans a datetime-normalized VIEW.
 */
import { describe, expect, it } from 'vitest';

import { admit, type Act, type ActSchema } from '../src/index.js';

const base = {
  id: 'act:1',
  actor: 'sys:gateway',
  provenance: 'test',
  recordedAt: '2026-10-09T00:00:00Z',
  actKind: 'domain_event' as const,
  edges: [],
};
const act = (payload: Record<string, unknown>): Act => ({ ...base, payload }) as Act;

const KEY_RE = '^[A-Za-z0-9_:.-]{1,64}$';
const schema: ActSchema = {
  actKind: 'domain_event',
  piiFields: [],
  fieldPolicies: [
    { payloadType: 'sys:target', key: 'key', opaquePattern: KEY_RE },
    { payloadType: 'sys:prompt-layer', key: 'body', verbatim: true },
  ],
};

describe('R-01 — admission field policies', () => {
  it('regression: a Telegram chat id fails the old opaque form (no letter) and the phone heuristic', () => {
    const legacy: ActSchema = { actKind: 'domain_event', piiFields: [], opaqueValueKeys: ['key'] };
    expect(admit(act({ type: 'sys:target', key: '-1004351636302' }), legacy).ok).toBe(false);
  });

  it('opaque pattern passes the chat id and the topic key on its own type', () => {
    expect(admit(act({ type: 'sys:target', key: '-1004351636302' }), schema).ok).toBe(true);
    expect(admit(act({ type: 'sys:target', key: '-1004351636302:56' }), schema).ok).toBe(true);
    expect(admit(act({ type: 'sys:target', key: '1112667160' }), schema).ok).toBe(true);
  });

  it('the same value on another type / another key / nested is still refused', () => {
    expect(admit(act({ type: 'note', key: '-1004351636302' }), schema).ok).toBe(false);
    expect(admit(act({ type: 'note', text: '-1004351636302' }), schema).ok).toBe(false);
    expect(admit(act({ type: 'sys:target', note: '-1004351636302' }), schema).ok).toBe(false);
    expect(admit(act({ type: 'sys:target', meta: { key: '-1004351636302' } }), schema).ok).toBe(false);
  });

  it('a value outside the pattern is scanned normally; email is never exempt', () => {
    expect(admit(act({ type: 'sys:target', key: '+7 916 123 45 67' }), schema).ok).toBe(false);
    expect(admit(act({ type: 'sys:target', key: 'a@b.co' }), schema).ok).toBe(false);
  });

  it('an unanchored or invalid pattern exempts nothing (fail-closed)', () => {
    const loose: ActSchema = { ...schema, fieldPolicies: [{ payloadType: 'sys:target', key: 'key', opaquePattern: '[0-9-]+' }] };
    expect(admit(act({ type: 'sys:target', key: '-1004351636302' }), loose).ok).toBe(false);
    const broken: ActSchema = { ...schema, fieldPolicies: [{ payloadType: 'sys:target', key: 'key', opaquePattern: '^([$' }] };
    expect(admit(act({ type: 'sys:target', key: '-1004351636302' }), broken).ok).toBe(false);
  });

  it('verbatim: a literal "YYYY-MM-DD HH:MM" does not trip the phone heuristic; a phone still does', () => {
    const body = 'Встреча 2026-10-09 14:30, потом 2026-10-10 09:00.';
    expect(admit(act({ type: 'note', text: body }), schema).ok).toBe(false); // without verbatim: phone-like
    expect(admit(act({ type: 'sys:prompt-layer', body }), schema).ok).toBe(true);
    expect(admit(act({ type: 'sys:prompt-layer', body: 'звони +7 916 123-45-67' }), schema).ok).toBe(false);
    expect(admit(act({ type: 'sys:prompt-layer', body: 'чат -1004351636302' }), schema).ok).toBe(false);
  });
});
