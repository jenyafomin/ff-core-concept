/**
 * EngineClient (S1) — the CROSS-MODULE seam every consumer (agents-manager at M3, CLI, future HTTP)
 * binds to. FROZEN: the four method shapes + the Decision/ViewResult/Ack/SubjectRef types.
 * EXTENSIBLE: new ViewDefs, corpora, callers (an HTTP or MCP caller is a new caller, not a new seam).
 */
import type { Act, Decision, EnvelopeNode, SubjectRef, ViewDef } from '../core/types.js';
import type { ViewResult } from '../core/view-compiler.js';

/** Write acknowledgement. `ok:false` means the act was REFUSED (e.g. admission-gate) and NOT journaled. */
export type Ack = { ok: true; act: Act } | { ok: false; reason: string };

export interface EngineClient {
  /** Run a compiled view for a viewer (all reads gated by resolve()). */
  view(def: ViewDef, viewer: SubjectRef): ViewResult;
  /** The single PEP. `key`: "read" | "write" | "write:<field>". */
  resolve(key: string, viewer: SubjectRef, node: EnvelopeNode): Decision;
  /** Admit + append an act. Fail-closed: inline-PII acts are refused BEFORE any journal write. */
  write(act: Act): Ack;
  /** Rebuild the read-model projection from the write-model or files. */
  rebuild(from: 'journal' | 'files'): void;
}
