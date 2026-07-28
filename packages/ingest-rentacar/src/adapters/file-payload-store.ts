/**
 * FilePayloadStore — file-first PayloadStore (ADR-0006 default, spec §5). PII content is written to
 * `<dir>/<payloadHash>.json`; the act keeps only `payload://<hash>` + the hash. Content-addressed, so
 * `put` is idempotent: identical PII overwrites identical bytes (no duplicate payloads across re-syncs).
 *
 * This is the M1 default persistence. A DB/object-store PayloadStore is a swap-in behind the same port
 * (post-F-D) — the ingest never assumes files, it assumes the PayloadStore contract.
 */
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashOf } from '../core/hash.js';
import type { PayloadRef, PayloadStore } from '../ports/payload-store.js';

export class FilePayloadStore implements PayloadStore {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  put(content: unknown): PayloadRef {
    const payloadHash = hashOf(content);
    const file = this.fileFor(payloadHash);
    // Content-addressed: write only if absent (identical content ⇒ identical bytes ⇒ no-op re-write).
    if (!existsSync(file)) writeFileSync(file, JSON.stringify(content), 'utf8');
    return { payloadRef: `payload://${payloadHash}`, payloadHash };
  }

  get(payloadHash: string): unknown | null {
    const file = this.fileFor(payloadHash);
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  }

  private fileFor(payloadHash: string): string {
    return join(this.dir, `${payloadHash}.json`);
  }
}
