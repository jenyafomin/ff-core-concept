// @ff/brain/read/access — who is reading, and may they see this record (SPEC R-7, AC-01…05, AC-08).
//
//   resolveReader(readers.json, caller) → Reader | DEFAULT_DENY | SENDER_DENIED   (never self-declared)
//   createReadGate(reader, deps)        → canSee(node): PEP (engine.resolve 'read' on readable_by)
//                                          ∧ scope gate (record scopes ∪ member-of closure ≤2) ∩ reader scopes
//
// Pure apart from the injected engine/store. Friction for refusals is the caller's job (C1 FrictionPort):
// a refusal here carries only a code, never the request body.
import { realpathSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { ALLOW, type EnvelopeNode, type Engine, type StorePort, type SubjectRef } from '@ff/engine';

import type {
  BrainError,
  CallerContext,
  ChatBinding,
  CliBinding,
  ClockPort,
  Reader,
  ReaderResolverPort,
  ReadersFile,
} from '../contract.js';
import { K } from '../domain/genesis.js';
import { OWNER_PRINCIPAL, READABLE_OWNER } from '../domain/pii-scope.js';
import { isBindingPrincipal, isPackPrincipal } from '../domain/principal.js';
import { SYS_GATEWAY, serviceReader } from '../domain/sys-types.js';
import { brainError, decodeNode, edgeStatus, type DomainRecord } from '../domain/to-act.js';
import { MEMBER_OF_HOPS, isRecordNode, readerScopeIds, resolveScopeRef, viewerOf } from '../domain/validate-act.js';

// ─── Reader resolution (readers.json allowlist) ────────────────────────────────────────────────────

const DENY_HINTS = {
  DEFAULT_DENY: 'В этом чате память недоступна — не обходи, скажи владельцу.',
  SENDER_DENIED: 'Память отвечает только владельцу — не обходи, не проси токен.',
} as const;

const deny = (code: keyof typeof DENY_HINTS, message: string): BrainError => ({
  ...brainError(code, message),
  hint: DENY_HINTS[code],
});

/** `chat:thread` → [`chat:thread`, `chat`]; `chat` → [`chat`]. The narrower key comes first. */
export function bindingKeysOf(conversationId: string): { thread?: string; chat: string } {
  const i = conversationId.indexOf(':');
  if (i <= 0) return { chat: conversationId };
  return { thread: conversationId, chat: conversationId.slice(0, i) };
}

/**
 * Derive the Reader from the caller (R-7). Order: gateway caller (conversation id) → allowlist key
 * (`chat:thread` merged over `chat`) else DEFAULT_DENY → sender must equal `owner_id` else SENDER_DENIED.
 * No conversation id → CLI: `cli[cwd]` else DEFAULT_DENY.
 *
 * SPEC-brain-data-doors: the binding's `principal` must be `user:`/`agent:`/`cli:` and its `pack` a valid
 * `pack:<id>` — otherwise DEFAULT_DENY (R-2.2; `system:*`/`sys:*` never come from readers.json). Authority is
 * ALWAYS `agent` on this path — the main token, even for `user:owner` (R-5.1): owner authority comes only from
 * a service mandate (SPEC-R1 R-03), never from a header or a body field.
 */
export function resolveReader(readers: ReadersFile, caller: CallerContext): Reader | BrainError {
  // SPEC-R1 R-03: the gateway mandate — principal and authority from the CREDENTIAL, never from headers/readers.json
  if (caller.credential === 'gateway') return serviceReader(SYS_GATEWAY);
  const conv = caller.conversation_id?.trim();
  if (conv) {
    const keys = bindingKeysOf(conv);
    const chatB: ChatBinding | undefined = readers.chats?.[keys.chat];
    const threadB: ChatBinding | undefined = keys.thread ? readers.chats?.[keys.thread] : undefined;
    if (!chatB && !threadB) return deny('DEFAULT_DENY', 'conversation is not in the allowlist');
    const sender = caller.sender_id?.trim();
    if (!sender || !readers.owner_id || sender !== String(readers.owner_id)) {
      return deny('SENDER_DENIED', 'sender is not the owner');
    }
    const merged: ChatBinding = { ...(chatB ?? {}), ...(threadB ?? {}) };
    const principal = merged.principal ?? OWNER_PRINCIPAL;
    const bad = bindingIssue(principal, merged.pack);
    if (bad) return deny('DEFAULT_DENY', bad);
    const reader: Reader = {
      kind: 'chat',
      key: threadB && keys.thread ? keys.thread : keys.chat,
      principal,
      scopes: [...(merged.scopes ?? [])],
      write: merged.write === true,
      personal: merged.personal === true,
      idem: typeof caller.message_id === 'string' && caller.message_id !== '',
      authority: 'agent',
    };
    if (merged.default_scope) reader.default_scope = merged.default_scope;
    if (merged.pack !== undefined) reader.pack = merged.pack;
    return reader;
  }
  const cwd = caller.cwd?.trim();
  const cli = cwd ? cliBindingFor(readers, cwd) : undefined;
  if (!cwd || !cli) return deny('DEFAULT_DENY', 'no conversation id and the cwd is not in the CLI allowlist');
  const bad = bindingIssue(cli.principal, cli.pack);
  if (bad) return deny('DEFAULT_DENY', bad);
  const reader: Reader = {
    kind: 'cli',
    key: cwd,
    principal: cli.principal,
    scopes: [...(cli.scopes ?? [])],
    write: cli.write === true,
    personal: cli.personal === true,
    idem: false,
    authority: 'agent',
  };
  if (cli.default_scope) reader.default_scope = cli.default_scope;
  if (cli.pack !== undefined) reader.pack = cli.pack;
  return reader;
}

/** Why a readers.json binding is unusable (R-2.2), or null. Never echoes the value (it may be a typo of a secret). */
function bindingIssue(principal: unknown, pack: unknown): string | null {
  if (!isBindingPrincipal(principal)) return 'binding principal is not a user:/agent:/cli: principal';
  if (pack !== undefined && !isPackPrincipal(pack)) return "binding pack is not 'pack:<id>'";
  return null;
}

/** Canonical form of a path: realpath (macOS `/tmp` → `/private/tmp`), else the resolved path (F-10). */
export function canonicalPath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolvePath(p);
  }
}

/** `cli[cwd]`: an exact key wins; otherwise keys and cwd are compared by their canonical (realpath) form. */
function cliBindingFor(readers: ReadersFile, cwd: string): CliBinding | undefined {
  const cli = readers.cli;
  if (!cli) return undefined;
  if (Object.prototype.hasOwnProperty.call(cli, cwd)) return cli[cwd];
  const want = canonicalPath(cwd);
  for (const [key, binding] of Object.entries(cli)) if (canonicalPath(key) === want) return binding;
  return undefined;
}

/** ReaderResolverPort over a readers.json source (C1 passes a loader that re-reads the file on change). */
export function createReaderResolver(readers: () => ReadersFile): ReaderResolverPort {
  return { resolve: (caller) => resolveReader(readers(), caller) };
}

// `viewerOf` (R-7 subject) lives in the domain (validate-act) so write-side reference checks share it.
export { viewerOf } from '../domain/validate-act.js';

// ─── Read gate ─────────────────────────────────────────────────────────────────────────────────────

/** What the read paths need from the brain domain (real Engine + DurableFsStore in production). */
export interface ReadDeps {
  engine: Pick<Engine, 'resolve'>;
  store: Pick<StorePort, 'load' | 'readNode' | 'acts'>;
  clock?: ClockPort;
}

// `MEMBER_OF_HOPS` / `isRecordNode` live in the domain (validate-act) — shared with write-side checks (F-2).
export { MEMBER_OF_HOPS, isRecordNode } from '../domain/validate-act.js';

/**
 * The node the PEP evaluates. A LEGACY record (pre-brain act, no `body.meta`, AC-09) carries its project as
 * `body.tenant`; the engine's tenant clamp (resolve.ts S8) would demand a `core:read` grant the brain never
 * mints, so every legacy record would be invisible. For legacy only, the tenant is lifted out of the PEP
 * view — decodeNode already turned it into an implicit `in-scope` and the brain scope gate enforces it —
 * and a missing `readable_by` defaults to owner-only (fail-closed: legacy acts may hold rentacar PII).
 * Brain-shaped records are passed through unchanged (a forged `body.tenant` still hits the clamp).
 */
export function pepViewOf(node: EnvelopeNode, rec: DomainRecord): EnvelopeNode {
  if (!rec.legacy) return node;
  const { tenant: _tenant, ...body } = (node.body ?? {}) as Record<string, unknown>;
  const rb = node.visibility?.readable_by;
  return {
    ...node,
    body,
    visibility: { ...(node.visibility ?? {}), readable_by: rb && rb.length ? [...rb] : [...READABLE_OWNER] },
  } as EnvelopeNode;
}

export interface ReadGate {
  reader: Reader;
  viewer: SubjectRef;
  /** Reader scopes as canonical ids. */
  scopes: ReadonlySet<string>;
  /** Scope ids reachable from `scopeIds` (themselves + active `member-of` parents, ≤2 hops). */
  closure(scopeIds: readonly string[]): Set<string>;
  /** PEP ∧ scope gate on a projected node (records only; registry/scope/base nodes → false). */
  canSee(node: EnvelopeNode, rec?: DomainRecord): boolean;
  /** Resolve a scope slug/id to its canonical id. */
  scopeIdOf(ref: string): string;
}

export function createReadGate(reader: Reader, deps: ReadDeps): ReadGate {
  const lookup = (id: string) => deps.store.readNode(id);
  const scopes = readerScopeIds(reader, lookup);
  const viewer = viewerOf(reader);
  const parentsCache = new Map<string, string[]>();

  const parentsOf = (scope: string): string[] => {
    let ps = parentsCache.get(scope);
    if (!ps) {
      const node = lookup(scope);
      ps = (node?.edges ?? [])
        .filter((e) => e.predicate === K.preds.memberOf && edgeStatus(e) === 'active')
        .map((e) => e.target);
      parentsCache.set(scope, ps);
    }
    return ps;
  };

  const closure = (scopeIds: readonly string[]): Set<string> => {
    const out = new Set(scopeIds);
    let frontier = [...scopeIds];
    for (let hop = 0; hop < MEMBER_OF_HOPS && frontier.length; hop++) {
      const next: string[] = [];
      for (const s of frontier) {
        for (const p of parentsOf(s)) {
          if (!out.has(p)) {
            out.add(p);
            next.push(p);
          }
        }
      }
      frontier = next;
    }
    return out;
  };

  return {
    reader,
    viewer,
    scopes,
    closure,
    scopeIdOf: (ref) => resolveScopeRef(ref, lookup),
    canSee(node, rec) {
      if (!isRecordNode(node)) return false;
      const r = rec ?? decodeNode(node);
      if (deps.engine.resolve('read', viewer, pepViewOf(node, r)) !== ALLOW) return false; // PEP (readable_by, ceilings)
      for (const s of closure(r.scopes)) if (scopes.has(s)) return true; // scope gate
      return false;
    },
  };
}

/** A record the reader may see, with the server time of its latest act (`recordedAt`). */
export interface VisibleRecord {
  node: EnvelopeNode;
  rec: DomainRecord;
  /** ISO `recordedAt` of the latest act on this record ('' if none). */
  touched_at: string;
}

/** Latest `recordedAt` per projected id (one pass over the journal). */
export function lastTouchById(acts: ReturnType<StorePort['acts']>): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of acts) {
    const ref = (a.provenance as { source_ref?: unknown } | undefined)?.source_ref;
    if (typeof ref !== 'string' || typeof a.recordedAt !== 'string') continue;
    const prev = out.get(ref);
    if (!prev || a.recordedAt > prev) out.set(ref, a.recordedAt);
  }
  return out;
}

/** Every record passing both gates. Retracted records are ALWAYS dropped (AC-42). */
export function visibleRecords(gate: ReadGate, deps: ReadDeps): VisibleRecord[] {
  const touched = lastTouchById(deps.store.acts());
  const out: VisibleRecord[] = [];
  for (const node of deps.store.load()) {
    if (!isRecordNode(node)) continue;
    const rec = decodeNode(node);
    if (rec.status === 'retracted') continue;
    if (!gate.canSee(node, rec)) continue;
    out.push({ node, rec, touched_at: touched.get(node.id) ?? '' });
  }
  return out;
}
