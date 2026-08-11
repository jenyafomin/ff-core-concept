/**
 * PayloadStore — the OUTBOUND port where PII goes to live (spec §5 / ADR-0007 F-B, ADR-0006 file-first).
 *
 * The rule (G3): PII (name / phone / free-text notes) NEVER travels inline in an act on the journal.
 * It is content-addressed OUT to this store; the act carries only `{ payloadRef, payloadHash }`. That
 * is what makes the admission-gate's no-inline-PII refusal satisfiable AND erasure verifiable (delete
 * the referenced content, the hash still proves what was there).
 *
 * `put` is idempotent by content-address: the same PII content yields the same `payloadHash` (and the
 * same file), so a re-run of ingest overwrites identical bytes — it does not fork a second payload.
 */
export interface PayloadRef {
  /** Opaque reference the act carries: `payload://<hash>`. Resolvable only via a PayloadStore. */
  payloadRef: string;
  /** Content-hash of the stored payload — anchors the ref (admission requires ref ⇒ hash). */
  payloadHash: string;
  /**
   * The scheme that produced `payloadHash` (e.g. `salted-sha256-v1`). Goes onto the act as `hashScheme` so
   * an auditor can tell a salted+co-shredded witness (safe to retain post-erasure) from a reversible digest.
   */
  hashScheme: string;
}

export interface PayloadStore {
  /**
   * Store PII content out-of-band; return only its ref + content-hash + hashScheme (never the content).
   * The content is stored SALTED (salt inside the blob, co-shredded): the returned `payloadHash` is over
   * (salt ‖ content), so identical PII does NOT necessarily content-address to the same blob — see the
   * idempotency note in FilePayloadStore (dedup still holds at the engine, which keys on the act, not the ref).
   */
  put(content: unknown): PayloadRef;
  /** Resolve stored content by hash (for erasure/verification tooling). null if absent/erased. */
  get(payloadHash: string): unknown | null;
  /**
   * Crypto-shred the referenced blob (V7 hard-erase, by-ref canon): the payload AND its co-stored salt are
   * destroyed together, so the retained `payloadHash` witness stops being a brute-force oracle. Accepts a
   * `payload://<hash>` ref or a bare hash. Returns true if a blob was shredded, false if it was already gone.
   * Idempotent: shredding an absent ref is a no-op. Does NOT touch the append-only act journal.
   */
  shred(ref: string): boolean;
}
