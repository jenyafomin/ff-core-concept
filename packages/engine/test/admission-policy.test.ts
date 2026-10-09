/**
 * B1 / R-9 (SPEC-brain-v0.6, AC-31, AC-32) — optional per-act-kind admission policy:
 * `allowKeys` lifts the PII-key check (value still scanned); `opaqueValueKeys` skips ONLY the phone
 * heuristic for values in opaque-id form. Without these fields behaviour is unchanged.
 */
import { describe, it, expect } from 'vitest';
import { admit, type Act, type ActSchema } from '../src/index.js';

const base = {
  id: 'act:1',
  actor: 'agent:brain',
  provenance: 'ingest',
  recordedAt: '2026-10-09T00:00:00Z',
  actKind: 'domain_event' as const,
  edges: [],
};
const act = (payload: Record<string, unknown>): Act => ({ ...base, payload }) as Act;

const personSchema: ActSchema = { actKind: 'domain_event', piiFields: [], allowKeys: ['name'] };
const opaqueSchema: ActSchema = { actKind: 'domain_event', piiFields: [], opaqueValueKeys: ['order_no'] };

describe('B1 — admission policy (allowKeys / opaqueValueKeys)', () => {
  it('regression: inline name without schema is refused', () => {
    const v = admit(act({ name: 'Ivan Petrov' }));
    expect(v.ok).toBe(false);
  });

  it('allowKeys passes name', () => {
    expect(admit(act({ name: 'Ivan Petrov' }), personSchema).ok).toBe(true);
  });

  it('allowKeys still refuses a phone-like VALUE in an allowed key', () => {
    const v = admit(act({ name: '+7 912 345 67 89' }), personSchema);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/phone-like/);
  });

  it('allowKeys still refuses an email VALUE in an allowed key', () => {
    expect(admit(act({ name: 'ivan@example.com' }), personSchema).ok).toBe(false);
  });

  it('allowKeys does not lift other default PII keys', () => {
    expect(admit(act({ name: 'Ivan', phone: 'n/a' }), personSchema).ok).toBe(false);
  });

  it('opaque passes ORD-123456789012', () => {
    expect(admit(act({ order_no: 'ORD-123456789012' }), opaqueSchema).ok).toBe(true);
  });

  it('the same value without opaque policy is refused (phone heuristic)', () => {
    expect(admit(act({ order_no: 'ORD-123456789012' })).ok).toBe(false);
  });

  it('opaque value outside ^[A-Z0-9-]{1,20}$ is scanned normally', () => {
    const v = admit(act({ order_no: 'ord 123456789012' }), opaqueSchema);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/phone-like/);
    // too long for the opaque form → normal scan → phone heuristic trips
    expect(admit(act({ order_no: 'ORD-1234567890123456789' }), opaqueSchema).ok).toBe(false);
  });

  it('opaque key refuses a pure-digit (phone-like) value — review BLOCKER 1', () => {
    expect(admit(act({ order_no: '380501234567' }), opaqueSchema).ok).toBe(false);
    expect(admit(act({ ORDER_NO: '380501234567' }), opaqueSchema).ok).toBe(false);
    expect(admit(act({ order_no: '380-50-123-45-67' }), opaqueSchema).ok).toBe(false);
  });

  it('opaque key still refuses an email', () => {
    const v = admit(act({ order_no: 'a@b.co' }), opaqueSchema);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/email-like/);
  });

  it('opaque exemption is per-key: a different key with the same value is scanned', () => {
    expect(admit(act({ other: 'ORD-123456789012' }), opaqueSchema).ok).toBe(false);
  });

  it('other actKinds / schemas without the new fields behave as before', () => {
    const plain: ActSchema = { actKind: 'domain_event', piiFields: ['secret'] };
    expect(admit(act({ secret: 'x' }), plain).ok).toBe(false);
    expect(admit(act({ name: 'Ivan' }), plain).ok).toBe(false);
    expect(admit(act({ ref: 'ORD-123456789012' }), plain).ok).toBe(false);
    expect(admit(act({ note: 'hello' }), plain).ok).toBe(true);
    expect(admit({ ...base, actKind: 'observation', payload: { name: 'Ivan' } } as unknown as Act).ok).toBe(false);
  });
});

describe('F-3 — phone heuristic catches parenthesised numbers; dates/ids/amounts still pass', () => {
  it.each(['(415) 555-0134', '+7(916)123-45-67', '8 (916) 123-45-67', 'тел 8 (916) 123-45-67', '+1 415 555 0134', '89161234567'])(
    '%s → refused as phone-like',
    (v) => {
      const r = admit(act({ text: v }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/phone-like/);
    },
  );

  it.each([
    '2026-10-09T14:30',
    'созвон 2026-10-09T14:30, потом 2026-10-10T09:15',
    'ORD-AB12',
    'Счёт 12 500 руб',
    'сумма 1 500 000 (полтора миллиона)',
    '09.10.2026 14:30',
    'версия 1.2.3 (сборка 45)',
  ])('%s → admitted', (v) => {
    expect(admit(act({ text: v })).ok).toBe(true);
  });
});
