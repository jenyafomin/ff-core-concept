/**
 * keys — the idempotency-key derivation (spec §3), computed DETERMINISTICALLY in the reducer so a
 * parse bug can't be baked into acts forever (critic-concern §3). Everything here is a pure function
 * of a raw cell value.
 *
 * IMPORTANT (admission interaction): an Order `numCore` like "45832-2865" is 9 digits with a dash and
 * TRIPS the engine's phone-heuristic. So a source_ref built from it may live ONLY in `provenance`
 * (unscanned) and edge `target` (unscanned) — NEVER in inline `payload` or edge `meta` (scanned). The
 * reducer honours this; keys.ts just produces the strings.
 */

/**
 * Leading `^\d+-\d+` of the Orders `#` column. We take the leading numeric-dash-numeric and IGNORE
 * everything after it — the mutable tails ("Long term" glued, " [AL]" spaced, "Collection"…) are
 * appended INCONSISTENTLY upstream (data-verification §1), so a suffix-stripping allowlist is brittle.
 * Returns null for empty / non-tabular junk (e.g. "Check Levels:") → the row is quarantined (§7).
 */
export function orderNumCore(rawHash: unknown): string | null {
  if (typeof rawHash !== 'string') return null;
  const m = rawHash.match(/^\s*(\d+-\d+)/);
  return m ? m[1] ?? null : null;
}

/** `sheets:Orders#<numCore>` — the Order node's stable natural key. */
export function orderSourceRef(numCore: string): string {
  return `sheets:Orders#${numCore}`;
}

/**
 * `sheets:Orders#<numCore>:customer` — the customer AS SEEN IN THIS ORDER (spec §3). No natural key:
 * per-occurrence, one customer node per order. `same-as` dedup across orders is M2, not here.
 */
export function customerSourceRef(numCore: string): string {
  return `${orderSourceRef(numCore)}:customer`;
}

/** A `SOLD-*` plate is a placeholder for a sold car, NOT a real plate (data-verification §3). */
export function isPlaceholderPlate(plate: unknown): boolean {
  return typeof plate === 'string' && /^\s*SOLD-/i.test(plate);
}

export interface CarKey {
  sourceRef: string;
  /** true ⇒ the plate is a `SOLD-*` placeholder; the ref is NOT keyed on the plate (§3). */
  placeholderPlate: boolean;
}

/**
 * Car natural key from `Plate No` (spec §3). A real plate keys directly: `sheets:Cars#<plate>`.
 * A `SOLD-*` placeholder must NOT collapse every sold car into one node, so it is keyed on a stable
 * per-car discriminator (`nodeId`, the "NODE ID (#)" column) instead — `sheets:Cars#SOLD:<nodeId>` —
 * and flagged `placeholderPlate`. Returns null if there is no usable key at all (→ quarantine).
 */
export function carSourceRef(plate: unknown, nodeId: unknown): CarKey | null {
  if (isPlaceholderPlate(plate)) {
    const disc = usableId(nodeId);
    if (disc === null) return null; // sold car with no stable discriminator → can't key safely
    return { sourceRef: `sheets:Cars#SOLD:${disc}`, placeholderPlate: true };
  }
  const p = typeof plate === 'string' ? plate.trim() : '';
  if (p === '' || p === '-') return null;
  return { sourceRef: `sheets:Cars#${p}`, placeholderPlate: false };
}

/** Treat "-" (dash placeholder, data-verification §3) and blanks as absent. */
function usableId(value: unknown): string | null {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v === '' || v === '-' ? null : v;
}
