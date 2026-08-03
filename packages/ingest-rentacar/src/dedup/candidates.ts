/**
 * candidates — the M2 `same-as` candidate generator (spec `04-m2-dedup-and-customer-lens.spec.md` R1,
 * build-steps `06-m2-build-steps.spec.md` S1/S2). PURE and store-agnostic: no `@ff/engine` import, no
 * `Engine.write`, no PayloadStore I/O here. That absence is the point — a candidate cannot become a
 * graph edge by construction (D5, "auto-merge is structurally impossible"), because this module has no
 * write path at all. The caller resolves PII out of the PayloadStore (EQ-3 gate) into `CustomerRecord`s
 * BEFORE calling this generator; scoring never touches the store itself.
 *
 * Normalizers are SCORING-ONLY (spec S1 invariant): `phone_norm`/`name_norm` never leak into an id, a
 * `source_ref`, or any returned candidate field beyond the coarse `provenance` label.
 */

export interface CustomerRecord {
  /** M1 per-occurrence customer node id (`sheets:Orders#<numCore>:customer`, keys.ts). */
  sourceRef: string;
  name?: string;
  phone?: string;
  /** Orders `Nationality` — tie-break only (R1): never a signal on its own. */
  nationality?: string;
}

export type SameAsConfidence = 'high' | 'medium';
export type SameAsProvenance = 'phone' | 'name' | 'phone+name';

/** A PROPOSAL, not a graph edge. See module doc: this shape has no `actKind`/`edges` — it cannot be
 * handed to `engine.write` without a separate, deliberate act-builder (same-as-writer.ts + a MANUAL
 * confirm). Non-projectable by construction. */
export interface SameAsCandidate {
  a: string;
  b: string;
  confidence: SameAsConfidence;
  provenance: SameAsProvenance;
}

/** `phone_norm` (S1): digits-only comparison key. Format is inconsistent upstream (`380…`/`79…`/
 * `971…`/`+…`, no leading `+` in most rows) — comparing raw digit runs is sufficient to recognise the
 * SAME number typed in different shapes without claiming a true E.164 parse. Empty ⇒ no phone signal. */
export function phoneNorm(phone: string | undefined): string | undefined {
  if (phone === undefined) return undefined;
  const digits = phone.replace(/\D+/g, '');
  return digits === '' ? undefined : digits;
}

/** `name_norm` (S1): upper + trim + token-sort. Fixes reorder (`Kushnerev Vladislav` ≡ `Vladislav
 * Kushnerev`) and CAPS-haos; deliberately does NOT fuzzy-match transliteration (`MOHAMMAD…` must stay
 * distinct from `Mohamed…` — AC2, the negative gate). */
export function nameNorm(name: string | undefined): string | undefined {
  if (name === undefined) return undefined;
  const tokens = name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return undefined;
  return [...tokens].sort().join(' ');
}

function downgrade(level: SameAsConfidence): SameAsConfidence {
  return level === 'high' ? 'medium' : level;
}

/**
 * Score ONE pair (R1 confidence table). Returns null for `none` (near-match/weak signal → NOT a
 * candidate, e.g. the Mohammad/Mohamed transliteration trap, AC2).
 */
export function scorePair(x: CustomerRecord, y: CustomerRecord): Omit<SameAsCandidate, 'a' | 'b'> | null {
  const px = phoneNorm(x.phone);
  const py = phoneNorm(y.phone);
  const nx = nameNorm(x.name);
  const ny = nameNorm(y.name);

  const phoneMatch = px !== undefined && py !== undefined && px === py;
  const nameMatch = nx !== undefined && ny !== undefined && nx === ny;

  let confidence: SameAsConfidence;
  let provenance: SameAsProvenance;
  if (phoneMatch && nameMatch) {
    confidence = 'high';
    provenance = 'phone+name';
  } else if (phoneMatch) {
    confidence = 'medium';
    provenance = 'phone';
  } else if (nameMatch) {
    confidence = 'medium';
    provenance = 'name';
  } else {
    return null; // none — no candidate emitted
  }

  // Nationality tie-break (R1): a declared disagreement lowers confidence one notch; never a signal
  // on its own (absent/undeclared nationality never affects the score).
  if (
    confidence === 'high' &&
    x.nationality !== undefined &&
    y.nationality !== undefined &&
    x.nationality.trim().toUpperCase() !== y.nationality.trim().toUpperCase()
  ) {
    confidence = downgrade(confidence);
  }

  return { confidence, provenance };
}

/**
 * Generate `same-as` CANDIDATES over all pairs of valid customer records (S2). Output is a flat,
 * ranked-by-confidence list of proposals — NOT written anywhere. `high` sorts before `medium`.
 */
export function generateCandidates(records: CustomerRecord[]): SameAsCandidate[] {
  const out: SameAsCandidate[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const scored = scorePair(records[i]!, records[j]!);
      if (scored === null) continue;
      out.push({ a: records[i]!.sourceRef, b: records[j]!.sourceRef, ...scored });
    }
  }
  const rank: Record<SameAsConfidence, number> = { high: 0, medium: 1 };
  return out.sort((l, r) => rank[l.confidence] - rank[r.confidence]);
}
