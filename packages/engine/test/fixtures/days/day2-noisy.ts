/**
 * Day-2 — the NOISY day (draft §A: Telegram-чат аренды). Duplicate messages (network lag), a plate
 * TYPO variant (`А123ВС77` vs `А123ВС7`), an INCOMPLETE person passport, a message that arrived
 * WITHOUT a `ts`. Проверяет V2 Тождество — переживает ли `canonicalId` дубль/опечатку/неполноту без
 * потери истории.
 *
 * What HOLDS (green): idempotent dedup collapses a byte-identical re-sent message; a partial passport
 * writes/reads without crashing. What does NOT (honest): the plate typo arrives as its OWN node — there
 * is no merge op to collapse the two writings into one (`same-as` is FORM only, ADR-0015 Reserved).
 */
import { domainEvent, type DayScenario } from '../../support/day-scenario.js';

export const day2Noisy: DayScenario = {
  id: 'day-2-noisy',
  title: 'шумный чат аренды',
  registry: { 'same-as': 'many', references: 'many' }, // `same-as` is kernel-locked `many` anyway
  acts: [
    // The canonical car…
    domainEvent({ ref: 'car:А123ВС77', type: 'car', body: { plate: 'А123ВС77', label: 'арендная' } }),
    // …and the TYPO variant, which today lands as a SEPARATE node (no merge op collapses it).
    domainEvent({ ref: 'car:А123ВС7', type: 'car', body: { plate: 'А123ВС7', label: 'арендная(опечатка)' } }),
    // a `same-as` edge is asserted canonical → typo (FORM only: no canonical_id inheritance, no merge).
    domainEvent({
      ref: 'car:А123ВС77',
      type: 'car',
      snapshotHash: 'h2', // changed hash ⇒ superseding event (adds the edge; body inherited)
      edges: [{ predicate: 'same-as', target: 'car:А123ВС7' }],
    }),
    // an INCOMPLETE person — a partial passport must not crash the write.
    domainEvent({ ref: 'person:artem-day2', type: 'person', body: { label: 'Артём' } }),
    // a message that arrived WITHOUT a ts (still a perfectly valid node).
    domainEvent({ ref: 'msg:rent-1', type: 'message', body: { summary: 'когда заберёте машину?' } }),
  ],
};

/**
 * The DUPLICATE: `msg:rent-1` re-sent byte-identical (network lag re-delivered it). Same source_ref +
 * same projected content ⇒ the kernel content-hash dedups it to a no-op (log does not grow). Run it AFTER
 * the day is written; assert with `assertDedup`.
 */
export const day2DupMessage = domainEvent({
  ref: 'msg:rent-1',
  type: 'message',
  body: { summary: 'когда заберёте машину?' },
});

/**
 * A customer record with an INLINE phone (PII) — the admission-gate must refuse it BEFORE any journal
 * write (T6). The safe form carries the same record BY-REF (`day2CustomerByRef`).
 */
export const day2CustomerInlinePii = domainEvent({
  ref: 'person:cust-7',
  type: 'person',
  actor: 'sync:rentacar',
  body: { label: 'клиент#7', phone: '+79161234567' }, // inline PII → refused fail-closed
});

export const day2CustomerByRef = domainEvent({
  ref: 'person:cust-7',
  type: 'person',
  actor: 'sync:rentacar',
  body: { label: 'клиент#7' }, // non-PII field may stay inline
  payloadRef: 'blob:customer-7', // PII lives behind the ref
  payloadHash: 'sha256:deadbeef',
});
