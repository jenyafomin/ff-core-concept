/**
 * agent-event-ingest — the FF-side WRITER of the minimal integration seam (D1, «second tenant»): a runtime
 * event from the agent system (agents-manager) becomes a node in FF's graph, one-directional, synchronized
 * THROUGH A FILE-DROP (never a shared store-dir — the two repos have colliding process/lock models, so a
 * direct import would race the single-writer lock; see raw/W2-02-integration-seam.map.md §2/§4).
 *
 * Design + adversarial verification:
 *   docs/_log/2026-09-13-core-spine-direction/SYNTHESIS.md §6 + raw/W2-02-integration-seam.map.md §4-§5.
 *
 * WHY `agent_trace`, NOT `domain_event`: a runtime process-event is the system watching ITSELF, it is NOT a
 * fact of the owner's life. Writing it as the reserved `agent_trace` act-kind (core/types.ts:230) makes
 * «телеметрия ≠ жизнь» a STRUCTURAL guarantee, not a convention: `isProjectable()` (core/projection.ts:42)
 * folds ONLY `domain_event` into the read-model, so an `agent_trace` can NEVER surface in day-graph. Proven
 * by test/agent-event-seam.test.ts (c) on a REAL mixed store, not asserted by reading the code.
 *
 * IDEMPOTENCY is content-addressed AT THE PORT, deliberately: the kernel dedup inside `Engine.write` (R5,
 * engine.ts:142) fires ONLY for projectable `domain_event`s — a non-projectable `agent_trace` "always
 * appends" (engine.ts:134). So this port reuses the kernel's OWN content hash (`idempotencyHash`,
 * core/idempotency.ts) as the discriminant: a candidate whose projection-relevant content already sits in the
 * log is skipped, so re-reading the same append-only file-drop is a clean no-op (does not grow the journal).
 *
 * RESERVED-FORM / paper-freeze (SYNTHESIS §6 «предусмотреть, но отложить»): FORM laid now, BEHAVIOR deferred.
 *   TODO(reverse): `direction` is carried as an explicit field (always 'export' today) so the reverse
 *     writeback (FF → agents-manager, e.g. «стоп из списка») needs no format change (W2-02 §5).
 *   TODO(identity): `actor` is a flat SubjectRef ('agents-manager'); the `agent:<slug>@<project>` granularity
 *     (REQ-2) is deferred — `SubjectRef=string` already accommodates it.
 *   TODO(consent/PII): this port assumes the source declares NO PII (REQ-6, "agents-manager has no PII").
 *     A PII-bearing source needs the consent/PII gate DECLARED BEFORE the exporter emits (ADR-0014 C3, still
 *     open) — NOT retrofitted here. The FF admission gate (fail-closed) is the last line, not the contract.
 *   TODO(exporter): the REAL agents-manager-side exporter (reads `unit_event`/FleetObserver → writes this
 *     drop) is NOT built here and lives in the OTHER repo (W2-02 §3, ADR must be a paired pair).
 */
import { idempotencyHash } from '../core/idempotency.js';
import type { Act } from '../core/types.js';

/** id/source_ref namespace for seam events — the read lens (process-view.ts) scopes on this prefix. */
export const AGENT_EVENT_PREFIX = 'agent-event:';

/** One runtime event as it arrives in the file-drop (agents-manager `unit_event` shape, non-PII fields). */
export interface AgentEvent {
  /** Stable unique id of the source event — the idempotency anchor (V5: we CITE it, never migrate the unit). */
  eventId: string;
  /** The source unit this event belongs to (e.g. `loop:…`, `decision:…`, `queue:…`, `budget:…`). */
  unitId: string;
  /** The emitting scope — 'agents-manager' today. */
  scope: string;
  /** Event class: loop_hang | decision | queue_wait | budget_warn | … (tenant vocabulary, open). */
  kind: string;
  /** Process-health severity, mirrors FleetObserver 🔴🟠🟡🟢: 'critical' | 'warn' | 'watch' | 'ok'. */
  severity: string;
  /** Human one-line — MUST be non-PII (see TODO(consent/PII) above). */
  summary: string;
  /** Source observation time. Carried in PROVENANCE, not payload — see toAgentTraceAct. */
  ts?: string;
  /** RESERVED bidirectionality slot (W2-02 §5): always 'export' today. */
  direction?: string;
}

/** The required non-empty string fields of an AgentEvent — the fail-closed form contract at the drop boundary. */
const REQUIRED_STRING_FIELDS = ['eventId', 'unitId', 'scope', 'kind', 'severity', 'summary'] as const;

/**
 * Parse an append-only JSONL file-drop into events. Blank lines are skipped; a malformed line throws with its
 * number. The file-drop is the ONE untrusted boundary of this seam (see docstring), so this is FAIL-CLOSED on
 * FORM, not just syntax: a syntactically valid JSON line with a missing/empty required field would otherwise
 * mint an `act:agent-event:undefined` ghost node — silent garbage in process-view with no error, no log. Such
 * a line is refused here with the SAME throw pattern as malformed JSON (REQ: no silent undefined-id acts).
 */
export function parseEventDrop(text: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      throw new Error(`agent-event-ingest: malformed JSON on drop line ${i + 1}: ${(e as Error).message}`);
    }
    const rec = parsed as Record<string, unknown> | null;
    for (const field of REQUIRED_STRING_FIELDS) {
      const v = rec == null ? undefined : rec[field];
      if (typeof v !== 'string' || v.trim() === '') {
        throw new Error(
          `agent-event-ingest: invalid event on drop line ${i + 1}: required field '${field}' must be a non-empty string`,
        );
      }
    }
    events.push(parsed as AgentEvent);
  }
  return events;
}

/**
 * F-B — the reserved author slot at the HONEST level `whoActed:'unverified'`: a self-claim recorded by FF's
 * memory, NOT an authenticated authority; nothing reads/enforces it (ADR-0010 ②). Same reserve as the seeds.
 */
const RESERVED_PRINCIPAL = { whoActed: 'unverified' as const, issuer: 'agent-event-ingest' };

/** Deterministic non-crypto label for `provenance.snapshotHash` (the kernel dedups on CONTENT, not this). */
function hashLabel(payload: unknown): string {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

/**
 * Build the non-projectable `agent_trace` Act for one runtime event. `recordedAt` is left '' (engine-assigned).
 * NOTE: `ts` rides `provenance.observed_at`, NOT the payload — an ISO timestamp is a 9+ digit run that the
 * admission PII heuristic (core/admission.ts, PHONE_RE) would false-trip; provenance is not PII-scanned.
 */
export function toAgentTraceAct(e: AgentEvent): Act {
  const payload = {
    kind: e.kind,
    severity: e.severity,
    unit: e.unitId,
    scope: e.scope,
    summary: e.summary,
    origin_event: e.eventId, // V5: cite the source event id; the unit stays sovereign in agents-manager.
    direction: e.direction ?? 'export', // RESERVED — reverse writeback deferred (W2-02 §5).
  };
  const provenance: { source_ref: string; snapshotHash: string; observed_at?: string } = {
    source_ref: `${AGENT_EVENT_PREFIX}${e.eventId}`,
    snapshotHash: hashLabel(payload),
  };
  if (e.ts) provenance.observed_at = e.ts;
  return {
    id: `act:${AGENT_EVENT_PREFIX}${e.eventId}`,
    actor: 'agents-manager', // RESERVED flat SubjectRef — see TODO(identity).
    provenance,
    recordedAt: '', // engine-assigned, immutable.
    actKind: 'agent_trace', // NON-projectable BY DESIGN — телеметрия ≠ жизнь, enforced by isProjectable().
    edges: [],
    principal: RESERVED_PRINCIPAL,
    payload,
  };
}

/** The minimal write surface this port needs — satisfied by `Engine` (`EngineClient.write`). */
export interface ActWriter {
  write(act: Act): { ok: boolean; act?: Act; reason?: string; dedup?: boolean };
}

export interface IngestResult {
  /** Acts actually written to the log this run. */
  written: Act[];
  /** Candidates skipped because their content already sat in the log (content-addressed idempotency). */
  skipped: number;
}

/**
 * Ingest runtime events into the engine as `agent_trace` acts, content-addressed idempotent. `existingActs`
 * (e.g. `store.acts()`) is REQUIRED — no default — so a re-read of the same file-drop is a no-op even though
 * the kernel does not dedup non-projectable acts; a `= []` default would let a forgetful caller silently
 * DISABLE idempotency and grow the journal on every re-read. Throws (fail-closed) if the admission gate
 * refuses any act.
 *
 * PII: `engine.write` runs the fail-closed `admit()` gate (core/admission.ts) UNCONDITIONALLY on every act
 * payload here — email/phone heuristics + no-inline-PII schema apply to `agent_trace` too. The residual risk
 * is free-text `summary` prose (names/addresses the heuristic can't catch); that is deferred to the source's
 * consent/PII contract, ADR-0014 C3 (owner decision), NOT retrofitted in this port — see TODO(consent/PII).
 */
export function ingestAgentEvents(
  engine: ActWriter,
  events: readonly AgentEvent[],
  existingActs: readonly Act[],
): IngestResult {
  const seen = new Set<string>();
  for (const a of existingActs) if (a.actKind === 'agent_trace') seen.add(idempotencyHash(a));

  const written: Act[] = [];
  let skipped = 0;
  for (const e of events) {
    const act = toAgentTraceAct(e);
    const key = idempotencyHash(act);
    if (seen.has(key)) {
      skipped++; // content already in the log — idempotent skip (kernel won't dedup a non-projectable act)
      continue;
    }
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`agent-event-ingest: write refused for '${act.id}': ${ack.reason}`);
    seen.add(key);
    written.push(ack.act ?? act);
  }
  return { written, skipped };
}
