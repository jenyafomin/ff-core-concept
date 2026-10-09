// PII through the real engine admission (AC-29…AC-33).
import { afterEach, describe, expect, it } from 'vitest';

import { buildTypeDefAct, normalizeDateTimes, validateDerivedFrom, validateSource } from '../../src/domain/index.js';
import { FIXED_NOW } from '../support/brain-fixture.js';
import { err, ok, openBrain, type Brain } from './harness.js';

let b: Brain;
afterEach(() => b?.close());

describe('datetimes (AC-29)', () => {
  it('normalizes `YYYY-MM-DD HH:MM` → T in every string, deep', () => {
    expect(normalizeDateTimes({ a: 'созвон 2026-10-09 14:30', b: ['2026-01-02 03:04 и 2026-01-03 05:06'], c: 5 })).toEqual({
      a: 'созвон 2026-10-09T14:30',
      b: ['2026-01-02T03:04 и 2026-01-03T05:06'],
      c: 5,
    });
  });

  it('«14:30» and «созвон 2026-10-09 14:30» in label / text / any string field are accepted, stored with T', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'созвон 2026-10-09 14:30', fields: { why: 'в 14:30 у них', due: '2026-10-09 14:30' } }));
    const n = ok(b.record({ type: 'note', label: 'в 14:30', fields: { text: 'перенесли на 2026-10-10 09:15', extra: 'ещё 2026-10-11 10:00' } }));
    expect(b.get(r.id).label).toBe('созвон 2026-10-09T14:30');
    expect(b.get(r.id).fields.due).toBe('2026-10-09T14:30');
    expect(b.get(n.id).fields).toMatchObject({ text: 'перенесли на 2026-10-10T09:15', extra: 'ещё 2026-10-11T10:00' });
    expect(b.journal()).not.toContain('2026-10-09 14:30');
  });
});

describe('phone / email refused (AC-30)', () => {
  it.each([
    ['label', { type: 'note', label: 'Позвонить +7 999 123-45-67' }],
    ['label email', { type: 'note', label: 'написать ivan@example.com' }],
    ['text field', { type: 'note', label: 'контакт', fields: { text: 'тел 89991234567' } }],
    ['extra field', { type: 'task', label: 'контакт', fields: { contact: 'a.b@mail.ru' } }],
    ['field named phone', { type: 'note', label: 'контакт', fields: { phone: 'нет' } }],
  ])('%s → PII_REFUSED, nothing written', (_n, req) => {
    b = openBrain();
    const before = b.acts().length;
    const journal = b.journal();
    expect(err(b.record(req as never)).code).toBe('PII_REFUSED');
    expect(b.acts()).toHaveLength(before);
    expect(b.journal()).toBe(journal);
  });

  it.each(['(415) 555-0134', '+7(916)123-45-67', 'тел 8 (916) 123-45-67'])('F-3: parenthesised phone %s → PII_REFUSED', (v) => {
    b = openBrain();
    const journal = b.journal();
    expect(err(b.record({ type: 'note', label: 'контакт', fields: { text: v } })).code).toBe('PII_REFUSED');
    expect(err(b.record({ type: 'task', label: `Позвонить ${v}` })).code).toBe('PII_REFUSED');
    expect(b.journal()).toBe(journal);
  });

  it('F-3 negatives: ISO datetime with T, opaque-looking ids and spaced amounts pass', () => {
    b = openBrain();
    expect(ok(b.record({ type: 'task', label: 'Созвон 2026-10-09T14:30', fields: { due: '2026-10-09T14:30' } })).ok).toBe(true);
    expect(ok(b.record({ type: 'note', label: 'Заказ ORD-AB12', fields: { text: 'сумма 1 500 000 руб (оплачено)' } })).ok).toBe(true);
  });

  it('a short amount in text passes (long digit runs are the accepted R-5 false positive)', () => {
    b = openBrain();
    expect(ok(b.record({ type: 'note', label: 'Счёт 12500 руб' })).ok).toBe(true);
  });
});

describe('person.name (AC-31)', () => {
  it('person.name passes (allowKeys); a phone inside person.name is refused', () => {
    b = openBrain();
    expect(ok(b.record({ type: 'person', label: 'Олег', fields: { name: 'Олег Иванов' } })).ok).toBe(true);
    expect(err(b.record({ type: 'person', label: 'Олег', fields: { name: 'Олег +79991234567' } })).code).toBe('PII_REFUSED');
  });
});

describe('name key outside person types (review MAJOR 2)', () => {
  it.each([
    ['note', { type: 'note', label: 'заметка', fields: { name: 'Иван Петров' } }],
    ['task', { type: 'task', label: 'дело', fields: { Name: 'Иван Петров' } }],
    ['unknown type → raw', { type: 'contact-card', label: 'карточка', fields: { name: 'Иван Петров' } }],
    ['type-def requested via record → raw', { type: 'type-def', label: 'x', fields: { name: 'Иван Петров' } }],
  ])('%s with fields.name → PII_REFUSED, nothing written', (_n, req) => {
    b = openBrain();
    const journal = b.journal();
    expect(err(b.record(req as never)).code).toBe('PII_REFUSED');
    expect(b.journal()).toBe(journal);
  });

  it('genesis type-def / scope acts still carry `name` (registry, not PII) and boot cleanly', () => {
    b = openBrain();
    expect(b.journal()).toContain('"name":"person"');
  });
});

describe('opaque fields (AC-32)', () => {
  it('opaque field (declared in a type-def) lets ORD-123456789012 through; other values scanned; email refused', () => {
    b = openBrain();
    b.appendRaw(JSON.stringify(buildTypeDefAct(
      { name: 'order', version: 1, status: 'active', fields: { order_no: { kind: 'text', opaque: true } } },
      { now: FIXED_NOW, actor: 'user:owner' },
    )));
    b.restart();
    expect(ok(b.record({ type: 'order', label: 'Заказ', fields: { order_no: 'ORD-123456789012' } })).ok).toBe(true);
    expect(err(b.record({ type: 'order', label: 'Заказ', fields: { order_no: 'ord 123456789012' } })).code).toBe('PII_REFUSED');
    expect(err(b.record({ type: 'order', label: 'Заказ', fields: { order_no: 'x@y.com' } })).code).toBe('PII_REFUSED');
    // the same value in a NON-opaque field is still scanned
    expect(err(b.record({ type: 'note', label: 'Заказ', fields: { text: 'ORD-123456789012' } })).code).toBe('PII_REFUSED');
  });
});

describe('source.ref / derived_from format (AC-33)', () => {
  it('pure validators', () => {
    expect(validateSource({ kind: 'file', ref: 'docs/x.md#L1' })).toBeNull();
    expect(validateSource({ kind: 'url', ref: 'https://example.com/a' })).toBeNull();
    expect(validateSource({ kind: 'file', ref: '/Users/x/notes/2026-10-09.md' })).toBeNull();
    // review MAJOR 4: a phone with separators is still a digit run ≥9
    expect(validateSource({ kind: 'url', ref: 'tel:050-123-45-67' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: '380-50-123-45-67' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'a/050.123.45.67' })?.code).toBe('SOURCE_REF_INVALID');
    // source.hash: lowercase hex 16..128 only
    expect(validateSource({ kind: 'file', ref: 'docs/x.md', hash: 'abcdef0123456789' })).toBeNull();
    expect(validateSource({ kind: 'file', ref: 'docs/x.md', hash: '380501234567' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'docs/x.md', hash: 'sha256-abc' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'docs/x.md', hash: 'ABCDEF0123456789' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'user@host' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'calls/89991234567.txt' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'mail', ref: 'x' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'a'.repeat(201) })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateSource({ kind: 'file', ref: 'a b' })?.code).toBe('SOURCE_REF_INVALID');
    expect(validateDerivedFrom(['u_abc@1', 'a_x9@12'])).toBeNull();
    expect(validateDerivedFrom(['u_abc'])?.code).toBe('DERIVED_FROM_INVALID');
    expect(validateDerivedFrom('u_abc@1')?.code).toBe('DERIVED_FROM_INVALID');
  });

  it('through record: SOURCE_REF_INVALID / DERIVED_FROM_INVALID, nothing written', () => {
    b = openBrain();
    const n = b.acts().length;
    expect(err(b.record({ type: 'note', label: 'x', source: { kind: 'file', ref: 'me@x.ru' } })).code).toBe('SOURCE_REF_INVALID');
    expect(err(b.record({ type: 'note', label: 'x', derived_from: ['task:1'] })).code).toBe('DERIVED_FROM_INVALID');
    expect(err(b.record({ type: 'note', label: 'x', layer: -1 })).code).toBe('BAD_REQUEST');
    expect(b.acts()).toHaveLength(n);
  });
});
