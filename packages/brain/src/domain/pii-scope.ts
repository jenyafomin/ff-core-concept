// @ff/brain/domain/pii-scope — the brain side of the PII gate (ADR-0016 D9, SPEC R-9).
//
// The engine's admission (allowKeys / opaqueValueKeys) does the refusing; the brain:
//   · normalizes `YYYY-MM-DD HH:MM` → `YYYY-MM-DDTHH:MM` in EVERY string before the scan (so a datetime
//     never looks like a phone number to the heuristic);
//   · validates what the scan does NOT cover (provenance): source.kind / source.ref / derived_from / layer;
//   · decides `readable_by` (R-7): owner visibility, person-typed records and personal scopes → owner only.
import { LIMITS, PATTERNS, SOURCE_KINDS, type BrainErrorCode, type SourceRef, type Visibility } from '../contract.js';

/** A refusal found by a pure check; validate-act.ts turns it into a wire `BrainError` (adds the hint). */
export interface PiiScopeIssue {
  code: BrainErrorCode;
  message: string;
}
const issue = (code: BrainErrorCode, message: string): PiiScopeIssue => ({ code, message });

const DATETIME_WITH_SPACE = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/g;

/** Normalize a single string. */
export function normalizeDateTimeString(s: string): string {
  return s.replace(DATETIME_WITH_SPACE, '$1T$2');
}

/** Deep-normalize every string inside a JSON-ish value (objects, arrays, strings). Pure. */
export function normalizeDateTimes<T>(value: T): T {
  if (typeof value === 'string') return normalizeDateTimeString(value) as T;
  if (Array.isArray(value)) return value.map((v) => normalizeDateTimes(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = normalizeDateTimes(v);
    return out as T;
  }
  return value;
}

/** Separators a phone number is commonly written with (`050-123-45-67`, `(050) 123.45.67`). */
const PHONE_SEPARATORS = /[\s\-().]/g;
/** `source.hash` — a lowercase hex digest only (lives in provenance, never in the scanned payload). */
export const SOURCE_HASH_RE = /^[a-f0-9]{16,128}$/;

/**
 * A digit run ≥9 in `ref` — checked both raw and after stripping phone separators, so
 * `tel:050-123-45-67` is refused while a dated path like `notes/2026-10-09.md` (8 digits) passes.
 */
export function hasPhoneLikeDigitRun(ref: string): boolean {
  return PATTERNS.sourceRefDigitRun.test(ref) || PATTERNS.sourceRefDigitRun.test(ref.replace(PHONE_SEPARATORS, ''));
}

/** R-9 / AC-33: `source.kind` enum, `source.ref` format (≤200, no `@`, no digit run ≥9 even with separators). */
export function validateSource(source: unknown): PiiScopeIssue | null {
  if (source === undefined) return null;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return issue('SOURCE_REF_INVALID', 'source must be an object {kind, ref, hash?}');
  }
  const s = source as Partial<SourceRef> & Record<string, unknown>;
  if (typeof s.kind !== 'string' || !(SOURCE_KINDS as readonly string[]).includes(s.kind)) {
    return issue('SOURCE_REF_INVALID', `source.kind must be one of ${SOURCE_KINDS.join('|')}`);
  }
  const ref = s.ref;
  if (
    typeof ref !== 'string' ||
    ref === '' ||
    ref.length > LIMITS.sourceRefMaxChars ||
    ref.includes('@') ||
    !PATTERNS.sourceRef.test(ref) ||
    hasPhoneLikeDigitRun(ref)
  ) {
    return issue(
      'SOURCE_REF_INVALID',
      `source.ref must match ${PATTERNS.sourceRef} (≤${LIMITS.sourceRefMaxChars}, no '@', no digit run ≥9)`,
    );
  }
  if (s.hash !== undefined && (typeof s.hash !== 'string' || !SOURCE_HASH_RE.test(s.hash))) {
    return issue('SOURCE_REF_INVALID', `source.hash must match ${SOURCE_HASH_RE} (lowercase hex digest)`);
  }
  const extra = Object.keys(s).filter((k) => !['kind', 'ref', 'hash'].includes(k));
  if (extra.length) return issue('SOURCE_REF_INVALID', `source has unknown keys: ${extra.join(', ')}`);
  return null;
}

/** R-9 / AC-33: `derived_from` = list of `u_…@rev` / `a_…@rev`. */
export function validateDerivedFrom(derived: unknown): PiiScopeIssue | null {
  if (derived === undefined) return null;
  if (!Array.isArray(derived) || !derived.every((d) => typeof d === 'string' && PATTERNS.derivedFrom.test(d))) {
    return issue('DERIVED_FROM_INVALID', `derived_from must be a list of ids matching ${PATTERNS.derivedFrom}`);
  }
  return null;
}

/** D7: `layer` is a non-negative integer (0 = fact). */
export function validateLayer(layer: unknown): PiiScopeIssue | null {
  if (layer === undefined) return null;
  if (typeof layer !== 'number' || !Number.isInteger(layer) || layer < 0) {
    return issue('BAD_REQUEST', 'layer must be a non-negative integer (0 = fact)');
  }
  return null;
}

// ─── readable_by (R-7) ──────────────────────────────────────────────────────────────────────────────

/** The owner principal the PEP reads against (R-7). */
export const OWNER_PRINCIPAL = 'user:owner';
export const READABLE_SCOPED: readonly string[] = [OWNER_PRINCIPAL, 'agent:*'];
export const READABLE_OWNER: readonly string[] = [OWNER_PRINCIPAL];

export interface ReadableByInput {
  visibility: Visibility;
  /** The record's type-def says `pii: person`. */
  personType: boolean;
  /** Any of the record's scopes is `kind: personal` or `pii: personal`. */
  personalScope: boolean;
}

export function readableByFor(i: ReadableByInput): string[] {
  return i.visibility === 'owner' || i.personType || i.personalScope ? [...READABLE_OWNER] : [...READABLE_SCOPED];
}
