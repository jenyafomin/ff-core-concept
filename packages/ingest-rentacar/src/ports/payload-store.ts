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
}

export interface PayloadStore {
  /** Store PII content out-of-band; return only its ref + content-hash (never the content). */
  put(content: unknown): PayloadRef;
  /** Resolve stored content by hash (for erasure/verification tooling). null if absent/erased. */
  get(payloadHash: string): unknown | null;
}
