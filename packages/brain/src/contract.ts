// @ff/brain — wire contract of the brain service (ADR-0016, SPEC-brain-v0.6 §3 R-5…R-8, §4 AC).
//
// THE single source of the request/response shapes shared by the service (@ff/brain) and the thin MCP
// client (@ff/brain-mcp). Rules for this file:
//   1. NO imports (not even @ff/engine) — @ff/brain-mcp carries a byte-copy of it (R-1: "копия типов,
//      тест на совпадение"). Anything engine-typed belongs in domain/, not here.
//   2. NO type/predicate NAMES as literals — those live only in domain/genesis.ts (AC-14 grep).
//      Types and predicates are plain `string` on the wire; the registry (journal) decides validity.
//   3. NO identity fields in request bodies (AC-06). Identity travels as env → HTTP headers.

/** Bumped on any breaking wire change; brain-mcp and service must agree. */
export const CONTRACT_VERSION = 1 as const;

// ─── Error codes ────────────────────────────────────────────────────────────────────────────────────

/**
 * Every refusal is `{ok:false, code, message, hint}` (R-6, AC-28). Codes named in SPEC/ADR come first;
 * the tail block is A1-added plumbing codes the SPEC implies (401, 400, limits) but does not name.
 */
export const ERROR_CODES = [
  // isolation (R-7, AC-01…05, AC-10)
  'DEFAULT_DENY',
  'SENDER_DENIED',
  'SCOPE_DENIED',
  // body / act validation (R-2, R-9, AC-30…34, AC-38)
  'RESERVED_FIELD',
  'IDENTITY_FIELD',
  'LABEL_REQUIRED',
  'PII_REFUSED',
  'SOURCE_REF_INVALID',
  'DERIVED_FROM_INVALID',
  'UNKNOWN_PREDICATE',
  'CONFLICT',
  // availability (R-8, AC-27)
  'SERVICE_DOWN',
  // A1-added plumbing (implied by R-5/R-6: 401 on bad token, 400 on malformed body, limits)
  'UNAUTHORIZED',
  'BAD_REQUEST',
  'NOT_FOUND',
  'WRITE_DENIED',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export type BrainErrorCode = (typeof ERROR_CODES)[number];

/** HTTP status the service answers with for each code (SERVICE_DOWN is produced client-side). */
export const ERROR_HTTP_STATUS: Readonly<Record<BrainErrorCode, number>> = {
  DEFAULT_DENY: 403,
  SENDER_DENIED: 403,
  SCOPE_DENIED: 403,
  WRITE_DENIED: 403,
  RESERVED_FIELD: 400,
  IDENTITY_FIELD: 400,
  LABEL_REQUIRED: 400,
  PII_REFUSED: 400,
  SOURCE_REF_INVALID: 400,
  DERIVED_FROM_INVALID: 400,
  UNKNOWN_PREDICATE: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_DOWN: 503,
};

/**
 * Non-fatal signals carried in `warnings[]` (AC-35: unknown type → raw + warning, not a refusal).
 * IDEM_BODY_MISMATCH: a replayed idem whose body differs from the original — the ORIGINAL answer comes back
 * (nothing new written) and the agent must not tell the owner the new content was saved (critic F-5).
 */
export const WARNING_CODES = ['UNKNOWN_TYPE_AS_RAW', 'DEDUP_CANDIDATES', 'TYPE_V_UNKNOWN', 'IDEM_BODY_MISMATCH', 'LENS_KIND_OUTSIDE_ORDER'] as const;
export type BrainWarningCode = (typeof WARNING_CODES)[number];

/** Friction reasons written as `friction` records — code + hash only, never the body (V7, R-4, R-7). */
/** DEF_REJECTED: a type-def/predicate-def act in the journal from a writer that may not define that name (ADR-0017 D1). */
export const FRICTION_CODES = ['BAD_LINE', 'UNKNOWN_TYPE', 'OUTBOX_IDENTITY_REJECTED', 'DEF_REJECTED', ...ERROR_CODES] as const;
export type FrictionCode = (typeof FRICTION_CODES)[number];

export interface BrainError {
  ok: false;
  code: BrainErrorCode;
  message: string;
  hint: string;
  /** SERVICE_DOWN on `record`: the call was parked in the outbox (R-8, AC-27). */
  queued?: boolean;
  /** UNKNOWN_PREDICATE: the known predicate names (AC-38). */
  known?: string[];
}

export interface BrainWarning {
  code: BrainWarningCode;
  message: string;
}

export type BrainResult<T extends { ok: true }> = T | BrainError;

// ─── Wire constants ─────────────────────────────────────────────────────────────────────────────────

/** Body keys the server owns; present in a request body → RESERVED_FIELD (R-2, AC-34). */
export const RESERVED_BODY_KEYS = ['tenant', 'space', 'capability', 'readable_by'] as const;

/** Identity keys that must never appear in a request body → IDENTITY_FIELD / 400 (AC-06). */
export const IDENTITY_KEYS = [
  'conversationId',
  'conversation_id',
  'author',
  'principal',
  'sender',
  'sender_id',
  'actor',
] as const;

export const LIMITS = {
  /** Whole HTTP request body (JSON bytes). Over → 413 PAYLOAD_TOO_LARGE; brain-mcp refuses it before sending. */
  requestBodyMaxBytes: 256 * 1024,
  labelMaxChars: 120,
  fieldsMaxBytes: 8 * 1024,
  textMaxBytes: 4 * 1024,
  /**
   * SPEC-R1 R-01: aggregate ceiling of ALL fields of one act, including fields whose type-def grants their own
   * `max_bytes` (those are outside the 8 KB budget, never outside this one).
   */
  actFieldsMaxBytes: 64 * 1024,
  recordsPerMinutePerConversation: 60,
  recordScopesMax: 10,
  recordEdgesMax: 20,
  findLimitDefault: 20,
  findLimitMax: 50,
  readDepthDefault: 1,
  readDepthMax: 2,
  readMaxNodesDefault: 25,
  readMaxNodesMax: 50,
  presetMaxChars: 4000,
  presetMaxLines: 12,
  /** Preset `overview` (the memory map): ≤1500 chars, cut with a «… обрезано» marker. */
  overviewMaxChars: 1500,
  morningCarriersMax: 2,
  sourceRefMaxChars: 200,
  frictionPerDay: 50,
  backupEveryActs: 50,
  backupEveryMs: 15 * 60 * 1000,
  backupsKept: 14,
} as const;

/** Format checks that are part of the request contract (R-9, AC-33). */
export const PATTERNS = {
  unitId: /^u_[a-z0-9]+$/,
  actId: /^a_[a-z0-9]+$/,
  derivedFrom: /^[ua]_[a-z0-9]+@\d+$/,
  sourceRef: /^[A-Za-z0-9._/:#-]+$/,
  sourceRefDigitRun: /\d{9,}/,
} as const;

/** Env the gateway sets for the MCP process (R-7). The MCP turns it into headers; never into args. */
export const BRAIN_ENV = {
  conversationId: 'FF_BRAIN_CONVERSATION_ID',
  messageId: 'FF_BRAIN_MESSAGE_ID',
  senderId: 'FF_BRAIN_SENDER_ID',
  channel: 'FF_BRAIN_CHANNEL',
  agentId: 'FF_BRAIN_AGENT_ID',
  socket: 'FF_BRAIN_SOCKET',
  /** Override of the brain home (`~/.ff-brain`) — tests and alt installs only. */
  home: 'FF_BRAIN_HOME',
} as const;

/** HTTP headers carrying caller identity from brain-mcp to the service (lower-case, Node style). */
export const BRAIN_HEADERS = {
  authorization: 'authorization',
  conversationId: 'x-ff-brain-conversation-id',
  messageId: 'x-ff-brain-message-id',
  senderId: 'x-ff-brain-sender-id',
  channel: 'x-ff-brain-channel',
  agentId: 'x-ff-brain-agent-id',
  cwd: 'x-ff-brain-cwd',
  idem: 'x-ff-brain-idem',
  contractVersion: 'x-ff-brain-contract',
} as const;

/** HTTP routes over the unix socket (R-5). TCP is never listened on. */
export const BRAIN_ROUTES = {
  record: { method: 'POST', path: '/v1/record' },
  find: { method: 'POST', path: '/v1/find' },
  read: { method: 'POST', path: '/v1/read' },
  link: { method: 'POST', path: '/v1/link' },
  health: { method: 'GET', path: '/v1/health' },
  stats: { method: 'GET', path: '/v1/stats' },
  export: { method: 'POST', path: '/v1/export' },
  /** SPEC-R1 R-05: read-only lens interpreter (gateway mandate only in R1). */
  lens: { method: 'POST', path: '/v1/lens' },
} as const;
export type BrainVerb = 'record' | 'find' | 'read' | 'link';
export const BRAIN_VERBS: readonly BrainVerb[] = ['record', 'find', 'read', 'link'];

/** Layout of the brain home, relative to `~/.ff-brain` (R-5). */
export const BRAIN_HOME_LAYOUT = {
  socket: 'brain.sock',
  token: 'token',
  /** SPEC-R1 R-03: the gateway mandate (0600) → reader `sys:gateway` with owner authority. */
  gatewayToken: 'gateway.token',
  journal: 'store/journal.jsonl',
  storeDir: 'store',
  readers: 'readers.json',
  service: 'service.json',
  backups: 'backups',
  outbox: 'outbox',
  export: 'export',
} as const;

// ─── Shared value types ─────────────────────────────────────────────────────────────────────────────

export type RecordStatus = 'active' | 'proposed' | 'retracted' | 'superseded';
export type EdgeStatus = 'active' | 'retracted';
export type Visibility = 'scoped' | 'owner';
export type Initiative = 'owner' | 'agent';
export type Temperature = 'hot' | 'cold';
export type SourceKind = 'file' | 'act' | 'url';
export const SOURCE_KINDS: readonly SourceKind[] = ['file', 'act', 'url'];
export type ScopeKind = 'personal' | 'company' | 'project';
export type FindPreset = 'morning' | 'evening' | 'open' | 'scope' | 'overview';
export const FIND_PRESETS: readonly FindPreset[] = ['morning', 'evening', 'open', 'scope', 'overview'];

/** D7 provenance pointer (form only in v0.5; `stale` is NOT computed — AC-43). */
export interface SourceRef {
  kind: SourceKind;
  ref: string;
  hash?: string;
}

/** Field values a record carries; shape is governed by the type-def in the journal, not here. */
export type FieldValue = string | number | boolean | null | string[];
export type Fields = Record<string, FieldValue>;

// ─── record ─────────────────────────────────────────────────────────────────────────────────────────

export interface RecordEdgeInput {
  pred: string;
  to: string;
}

/** R-6 record. With `id` = update (server merges old body + changes); `retract:true` = soft retract. */
export interface RecordRequest {
  type: string;
  label: string;
  fields?: Fields;
  /** Scope slugs or ids, ≤10. Omitted → the binding's `default_scope` (AC-04). */
  scopes?: string[];
  edges?: RecordEdgeInput[];
  visibility?: Visibility;
  /** `agent` → status `proposed` (AC-45). */
  initiative?: Initiative;
  id?: string;
  expected_rev?: number;
  retract?: boolean;
  reason?: string;
  derived_from?: string[];
  source?: SourceRef;
  layer?: number;
}

export interface DedupCandidate {
  id: string;
  label: string;
  updated_at: string;
}

export interface RecordResponse {
  ok: true;
  id: string;
  rev: number;
  type: string;
  type_v: number;
  status: RecordStatus;
  /** True for an idem replay (AC-24) or the same normalized label in the same scope within 24h. */
  dedup: boolean;
  existing_id?: string;
  candidates?: DedupCandidate[];
  warnings: BrainWarning[];
  receipt: Receipt;
}

// ─── find ───────────────────────────────────────────────────────────────────────────────────────────

export interface FindRequest {
  scope?: string;
  type?: string;
  status?: string;
  text?: string;
  due_before?: string;
  /** Filter by an edge: records having `pred` (optionally to `to`). */
  edge?: { pred: string; to?: string };
  preset?: FindPreset;
  include_cold?: boolean;
  /** ≤50, default 20. */
  limit?: number;
  cursor?: string;
}

/** Bodies are never returned by find; retracted records are always hidden. */
export interface FindItem {
  id: string;
  type: string;
  label: string;
  status?: string;
  due?: string;
  scopes: string[];
  updated_at: string;
}

export interface FindResponse {
  ok: true;
  items: FindItem[];
  total: number;
  next_cursor?: string;
  /**
   * Preset digest (≤4000 chars, ≤12 lines, remainder as «ещё N»). Present only with `preset`. `overview` = the
   * memory map: per visible scope its mode, type × status counts, cold count, last write; no items (≤1500 chars).
   */
  digest?: string;
  /** morning preset: count of overdue items. */
  overdue?: number;
}

// ─── read ───────────────────────────────────────────────────────────────────────────────────────────

export interface ReadRequest {
  id: string;
  /** 0..2, default 1. */
  depth?: number;
  /** ≤50, default 25. */
  max_nodes?: number;
  preds?: string[];
}

export interface RecordMeta {
  author: string;
  owner?: string;
  created_at: string;
  updated_at: string;
  rev: number;
  temperature: Temperature;
  pinned: boolean;
}

export interface NodeView {
  id: string;
  /** Effective type (last non-retracted reclassification edge, else declared). */
  type: string;
  declared_type: string;
  type_v: number;
  label: string;
  status: RecordStatus;
  visibility: Visibility;
  fields: Fields;
  scopes: string[];
  meta: RecordMeta;
  initiative?: Initiative;
  derived_from?: string[];
  source?: SourceRef;
  layer?: number;
}

export interface EdgeView {
  id: string;
  pred: string;
  to: string;
  status: EdgeStatus;
  dangling?: boolean;
  author?: string;
  confidence?: number;
  created_at?: string;
}

export interface NeighborView {
  id: string;
  type: string;
  label: string;
}

export interface ReadResponse {
  ok: true;
  node: NodeView;
  edges: EdgeView[];
  neighbors: NeighborView[];
  truncated: boolean;
}

// ─── link ───────────────────────────────────────────────────────────────────────────────────────────

export interface LinkRequest {
  from: string;
  pred: string;
  to: string;
  confidence?: number;
  /** `retracted` = edge retraction; server merges meta (keeps author/confidence/created_at — AC-41). */
  status?: EdgeStatus;
  note?: string;
}

export interface LinkResponse {
  ok: true;
  edge_id: string;
  dangling: boolean;
  /** Present only when non-empty (e.g. IDEM_BODY_MISMATCH on a replayed link idem). */
  warnings?: BrainWarning[];
  receipt: Receipt;
}

// ─── health / stats / export ────────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  ok: true;
  contract: typeof CONTRACT_VERSION;
  started_at: string;
  uptime_s: number;
  acts: number;
  records: number;
  /** Corrupt journal lines skipped on replay (R-4, AC-15). */
  bad_lines: number;
  /** Write-path latency (AC-47). */
  write_p95_ms: number | null;
  queue_depth: number;
  last_backup_at: string | null;
}

export interface StatsResponse {
  ok: true;
  total: number;
  by_scope: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ExportRequest {
  /** Restrict to these scopes (still ∩ caller's scopes). */
  scopes?: string[];
}

export interface ExportResponse {
  ok: true;
  /** Absolute path of the written file under `~/.ff-brain/export/`. */
  path: string;
  count: number;
}

// ─── lens (SPEC-R1 R-05) ────────────────────────────────────────────────────────────────────────────

/**
 * The context a lens is applied to. Each present key is one target `(kind, key)`: `bot`/`chat`/`user`/`project`/
 * `agent` as given; `topic` is the RAW thread id — the server forms the topic key `<chat>:<topic>` (a topic is
 * unique only inside its chat).
 */
export interface LensContext {
  bot?: string;
  chat?: string;
  topic?: string;
  user?: string;
  project?: string;
  agent?: string;
}

export interface LensRequest {
  /** `<lens_id>@<version>`, e.g. `prompt-compose@1`. */
  lens: string;
  context: LensContext;
}

export interface LensManifestEntry {
  /** Layer record id. */
  id: string;
  rev: number;
  /** Target kinds of the layer (sorted). */
  kinds: string[];
  /** `source.hash` of the layer (importer: sha256 of the file text it came from). */
  source_hash?: string;
}

export interface LensResponse {
  ok: true;
  text: string;
  /** Layers that made it into `text`, in composition order. */
  manifest: LensManifestEntry[];
  lens: { id: string; rev: number };
  /** sha256 hex of `text` (utf8). */
  hash: string;
  warnings: BrainWarning[];
}

// ─── Receipt ────────────────────────────────────────────────────────────────────────────────────────

/** Server-built, passed by the agent verbatim (D12, AC-28). */
export type Receipt = string;

/** «Записано: <label> → <область> · <type/status> · #<хвост id>». */
export interface ReceiptParts {
  label: string;
  scope: string;
  type: string;
  status: RecordStatus | EdgeStatus;
  id: string;
}

/** Characters of the id shown in a receipt (agent never shows a full id — protocol §12). */
export const RECEIPT_ID_TAIL = 6;

export function formatReceipt(p: ReceiptParts): Receipt {
  return `Записано: ${p.label} → ${p.scope} · ${p.type}/${p.status} · #${p.id.slice(-RECEIPT_ID_TAIL)}`;
}

// ─── Readers (readers.json, R-7) ────────────────────────────────────────────────────────────────────

/**
 * One allowlist entry keyed by `chatId` or `chatId:threadId` (narrower key wins). `principal` must be
 * `user:` / `agent:` / `cli:` (ADR-0017 D1); `pack: 'pack:<id>'` = this binding writes ON BEHALF of a pack
 * (stamped into `provenance.pack`, `actor` stays the principal). Malformed → DEFAULT_DENY.
 *
 * `write_scopes` (SPEC-access-and-overview): when SET, writes go ONLY to these scopes (each must also be in
 * `scopes` — write ⇒ read; extras are ignored), `write` is `write_scopes.length > 0`, and a `default_scope` outside
 * them is replaced by the first write scope. When ABSENT, legacy: `write: true` = write to every scope in `scopes`.
 */
export interface ChatBinding {
  principal?: string;
  scopes?: string[];
  default_scope?: string;
  write?: boolean;
  /** Per-scope write right (slugs/ids, ⊆ `scopes`). Absent = legacy `write` over all `scopes`. */
  write_scopes?: string[];
  personal?: boolean;
  pack?: string;
}

/** CLI (Claude Code outside the gateway) entry keyed by absolute cwd; principal `cli:<cwd>`. */
export interface CliBinding {
  principal: string;
  scopes: string[];
  default_scope?: string;
  write?: boolean;
  /** Per-scope write right (slugs/ids, ⊆ `scopes`). Absent = legacy `write` over all `scopes`. */
  write_scopes?: string[];
  personal?: boolean;
  pack?: string;
}

/**
 * Who may approve (SPEC-brain-data-doors R-5): derived ONLY from the credential, never from the request.
 * `agent` — the main token (chat via brain-mcp, CLI), ALWAYS, even for principal `user:owner` (the owner's own
 * Telegram message reaches the brain through an agent). `owner` — only a service mandate (`gateway.token` →
 * `sys:gateway`, SPEC-R1 R-03) or the in-process `sys:brain`.
 */
export type Authority = 'owner' | 'agent';

/** `~/.ff-brain/readers.json` — edited by the owner only. */
export interface ReadersFile {
  owner_id: string;
  chats: Record<string, ChatBinding>;
  cli?: Record<string, CliBinding>;
}

/** The reader the service derives (never self-declared): chat:thread merged over chat, or cli[cwd]. */
export interface Reader {
  /** `service` = a service mandate (SPEC-R1 R-03: `gateway.token` → `sys:gateway`), never from readers.json. */
  kind: 'chat' | 'cli' | 'service';
  /** The readers.json key that matched (`chat:thread`, `chat`, or the cwd). */
  key: string;
  principal: string;
  scopes: string[];
  default_scope?: string;
  write: boolean;
  /**
   * Present only when the binding sets `write_scopes`: the scopes writes may go to (∩ `scopes`, checked on
   * canonical ids at write time). Absent = every scope in `scopes` (legacy `write`).
   */
  write_scopes?: string[];
  personal: boolean;
  /** False for CLI (no message_id → no idem, AC-26). */
  idem: boolean;
  /** Set only by the reader resolver from the credential (R-5.1). Absent ≡ 'agent' (fail-closed). */
  authority?: Authority;
  /** `pack:<id>` this binding delegates for (R-2.3). */
  pack?: string;
}

// ─── Caller identity (headers → service) ────────────────────────────────────────────────────────────

/** What the service learns about the caller — only from headers set by brain-mcp from env. */
export interface CallerContext {
  conversation_id?: string;
  message_id?: string;
  sender_id?: string;
  channel?: string;
  agent_id?: string;
  cwd?: string;
  /** sha256(conversationId + message_id + verb + ordinal), computed by brain-mcp (R-8). */
  idem?: string;
  /**
   * Which bearer token authenticated the call (SPEC-R1 R-03). Set ONLY by the HTTP layer from the token match —
   * never from a header or a body. Absent ≡ `main`.
   */
  credential?: 'main' | 'gateway';
}

// ─── Outbox (brain-mcp side, R-8) ───────────────────────────────────────────────────────────────────

/** `~/.ff-brain/outbox/<idem|uuid>.json` (0600). Identity is re-checked by the service on replay. */
export interface OutboxEntry {
  contract: typeof CONTRACT_VERSION;
  verb: 'record';
  queued_at: string;
  caller: CallerContext;
  request: RecordRequest;
}

// ─── Ports ──────────────────────────────────────────────────────────────────────────────────────────

/** The service surface (implemented by C1 runtime; called by the HTTP layer and by tests directly). */
export interface BrainPort {
  record(caller: CallerContext, req: RecordRequest): Promise<BrainResult<RecordResponse>>;
  find(caller: CallerContext, req: FindRequest): Promise<BrainResult<FindResponse>>;
  read(caller: CallerContext, req: ReadRequest): Promise<BrainResult<ReadResponse>>;
  link(caller: CallerContext, req: LinkRequest): Promise<BrainResult<LinkResponse>>;
  health(): Promise<HealthResponse>;
}

/** Derives the Reader from the caller (DEFAULT_DENY / SENDER_DENIED on failure). */
export interface ReaderResolverPort {
  resolve(caller: CallerContext): Reader | BrainError;
}

/** Writes body-less friction records (code + hash), deduped, ≤50/day. */
export interface FrictionPort {
  report(f: { code: FrictionCode; hash: string; verb?: BrainVerb | 'replay' | 'outbox' }): void;
}

/** Injected time and randomness so ids/receipts/backups are deterministic in tests. */
export interface ClockPort {
  now(): Date;
}
export interface RandomPort {
  /** Lower-case base36 suffix for `u_`/`a_` ids. */
  suffix(len: number): string;
}
