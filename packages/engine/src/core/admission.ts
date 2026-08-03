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

/**
 * Walk an inline value; return a reason if it structurally carries PII (a PII key) or looks like PII.
 * `root` labels the location in the refusal reason (default 'payload'; edge meta uses 'edges[i].meta').
 */
function scan(value: unknown, schema: ActSchema | undefined, path: string, root = 'payload'): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (EMAIL_RE.test(value)) return `inline PII (email-like value) at ${root}.${path || '<root>'}`;
    if (PHONE_RE.test(value)) return `inline PII (phone-like value) at ${root}.${path || '<root>'}`;
    return null;
  }
  if (typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const r = scan(value[i], schema, `${path}[${i}]`, root);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isPiiKey(k, schema)) return `inline PII field '${k}' at ${root}.${path ? path + '.' : ''}${k} — must use payloadRef+payloadHash`;
    const r = scan(v, schema, path ? `${path}.${k}` : k, root);
    if (r) return r;
  }
  return null;
}

// ── GAP 3 (c) — one-home barrier (S5) ────────────────────────────────────────────────────────────
/** A tenant's noun for a class of fact ('payment', 'car'). Tenant vocabulary — the kernel holds none. */
export type FactKind = string;
/** A writer-home domain ('rental-balance', 'sheets'). Tenant vocabulary. */
export type Domain = string;

/**
 * The one-home registry (S6 policy-as-data, injected — NOT baked into the kernel, G1). Maps a factKind to
 * its SOLE writer-home domain. Grows by INSERT (I-13). Absent ⇒ the barrier is OFF (behaviour unchanged).
 */
export interface HomeRegistry {
  homes: Record<FactKind, Domain>;
}

/**
 * GAP 3 (c) — the one-home barrier: a factKind has exactly ONE writer-home domain. A `domain_event` whose
 * declared `provenance.domain` differs from the registered home for its `provenance.fact_kind` is REFUSED —
 * even when its `source_ref` differs (a different ref is exactly what `Engine.write`'s ref-dedup does NOT
 * catch; this is the domain barrier that does). Enforced STATELESSLY per-act at factKind granularity: the
 * kernel never needs to know two differing source_refs are the same underlying fact.
 *
 * Domain/factKind are read from the already-OPEN `provenance` object (additive convention fields), so the
 * frozen Act envelope is untouched. Fail-OPEN on a missing `domain` (chosen minimal default — owner may
 * tighten to fail-closed; flagged in docs/_inbox). No-op when no `homeRegistry` is injected.
 */
export function admitHome(act: Act, homeRegistry?: HomeRegistry): Admission {
  if (!homeRegistry) return ok();
  const p = act.provenance;
  if (p === null || typeof p !== 'object') return ok();
  const fk = (p as { fact_kind?: unknown }).fact_kind;
  if (typeof fk !== 'string' || !Object.prototype.hasOwnProperty.call(homeRegistry.homes, fk)) return ok();
  const home = homeRegistry.homes[fk];
  const dom = (p as { domain?: unknown }).domain;
  if (typeof dom === 'string' && dom !== home) {
    return refuse(
      `one-home: fact_kind '${fk}' is homed to '${home}'; act domain '${dom}' may not write it (second writer-home)`,
    );
  }
  return ok();
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
  // Edge meta is a payload too. A tenant may put confidence/provenance on identity/link edges, where a
  // phone/name can slip in — the same no-inline-PII rule applies, fail-closed, per-edge.
  for (let i = 0; i < (act.edges ?? []).length; i++) {
    const meta = act.edges[i]?.meta;
    if (meta === undefined) continue;
    const reason = scan(meta, undefined, '', `edges[${i}].meta`);
    if (reason) return refuse(reason);
  }
  return ok();
}
