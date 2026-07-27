/**
 * admission — the no-inline-PII gate (ADR-0007 §"Minimal day-1 rule", gate G3, approved 2026-07-26).
 *
 * Rule (R-G3.1 / R-G3.4): an act entering the append-only journal carries PII ONLY by reference
 * (`payloadRef` + `payloadHash`) — NEVER inline. The gate is STRUCTURAL/schema-driven: each act-kind
 * declares its PII-bearing fields, which must be refs, not inline values. A heuristic scanner
 * (email/phone/etc.) is defense-in-depth, not the primary gate.
 *
 * Fail-CLOSED BY BEHAVIOUR: `admit()` runs BEFORE any journal write (see EngineClient.write); if an
 * act inlines PII it is REFUSED and never reaches the log. This exists at M0 so M1 rentacar ingest
 * (customer names/phones) is safe by construction.
 */
import { type Act, type ActKind, type Admission } from './types.js';

/** Per-act-kind schema: which inline `payload` keys are PII-bearing and MUST travel as a ref instead. */
export interface ActSchema {
  actKind: ActKind;
  /** dotted paths inside `payload` that are PII and may not be inlined. */
  piiFields: string[];
}

/**
 * Default PII field names. Fail-closed: even without a registered schema, these keys inlined in a
 * payload are refused. rentacar-ingest PII columns are known ahead of time (name, phone).
 */
const DEFAULT_PII_KEYS = [
  'name',
  'fullname',
  'firstname',
  'lastname',
  'customername',
  'phone',
  'phonenumber',
  'customerphone',
  'email',
  'passport',
  'passportnumber',
  'address',
  'card',
  'cardnumber',
  'iban',
  'nationalid',
];

// Defense-in-depth heuristics (NOT the primary gate).
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\s-]?){9,15}/;

const ok = (): Admission => ({ ok: true });
const refuse = (reason: string): Admission => ({ ok: false, reason });

function isPiiKey(key: string, schema?: ActSchema): boolean {
  const k = key.toLowerCase();
  if (schema?.piiFields.some((f) => f.toLowerCase() === k || f.toLowerCase().endsWith('.' + k))) return true;
  return DEFAULT_PII_KEYS.includes(k);
}

/** Walk an inline value; return a reason if it structurally carries PII (a PII key) or looks like PII. */
function scan(value: unknown, schema: ActSchema | undefined, path: string): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (EMAIL_RE.test(value)) return `inline PII (email-like value) at payload.${path || '<root>'}`;
    if (PHONE_RE.test(value)) return `inline PII (phone-like value) at payload.${path || '<root>'}`;
    return null;
  }
  if (typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const r = scan(value[i], schema, `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isPiiKey(k, schema)) return `inline PII field '${k}' at payload.${path ? path + '.' : ''}${k} — must use payloadRef+payloadHash`;
    const r = scan(v, schema, path ? `${path}.${k}` : k);
    if (r) return r;
  }
  return null;
}

/**
 * The admission predicate. Refuses an act that inlines PII; passes an act that references PII via
 * payloadRef + payloadHash. Fail-closed on ambiguity.
 */
export function admit(act: Act, schema?: ActSchema): Admission {
  // Integrity: a ref must be accompanied by its content-hash (so erasure is verifiable).
  if (act.payloadRef !== undefined && (act.payloadHash === undefined || act.payloadHash === '')) {
    return refuse('payloadRef present without payloadHash — ref-carried payload must be hash-anchored');
  }
  // Structural + heuristic: no inline PII anywhere in the act body.
  if (act.payload !== undefined) {
    const reason = scan(act.payload, schema, '');
    if (reason) return refuse(reason);
  }
  return ok();
}
