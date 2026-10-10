// @ff/brain/domain/names — the name grammar of types and predicates (ADR-0017 D1, SPEC-brain-data-doors R-1).
//
//   core-bare      `task`               — only names in CORE_TYPE_NAMES / CORE_PREDICATE_NAMES (genesis)
//   sys:<n>        `sys:prompt-layer`   — the platform (flat; R1 seeds `sys:` types as `sys:brain`)
//   pack:<id>/<n>  `pack:bt/issue`      — a plugin pack, writer-bound to `pack:<id>`
//   u:<n>          `u:meeting`          — user/agent trails
//
//   <id> = ^[a-z0-9][a-z0-9-]{0,31}$     <n> = ^[a-z][a-z0-9-]{0,47}$
//
// `canonicalName`: `core:x` → `x` · core-bare stays · any other bare name → `u:x` (ALIAS: legacy journal lines
// keep their bare spelling forever; every comparison goes through the canonical form) · anything else → null.
// Writes always use the canonical spelling; reads accept either.
import { CORE_PREDICATE_NAMES, CORE_TYPE_NAMES, GENESIS_ACTOR, predicateDefId, typeDefId } from './genesis.js';
import { PRINCIPAL_ID_RE, principalScheme } from './principal.js';

export type DefKind = 'type' | 'predicate';

/** `<n>` of `sys:<n>` / `pack:<id>/<n>` / `u:<n>` and of a bare alias. */
export const NAME_SEGMENT_RE = /^[a-z][a-z0-9-]{0,47}$/;
/** `<id>` of `pack:<id>/<n>` (same grammar as a `pack:<id>` principal). */
export const PACK_ID_RE = PRINCIPAL_ID_RE;

/** Layer prefixes. A request ref value starting with one of these is a NAME, never a node id (R-1.9). */
export const NAME_LAYER_PREFIXES = ['core:', 'sys:', 'pack:', 'u:'] as const;

const coreSet = (kind: DefKind): ReadonlySet<string> => (kind === 'type' ? CORE_TYPE_NAMES : CORE_PREDICATE_NAMES);

/** Canonical spelling of a type/predicate name, or null when it is not a legal name. */
export function canonicalName(kind: DefKind, name: unknown): string | null {
  if (typeof name !== 'string' || name === '') return null;
  const i = name.indexOf(':');
  if (i === -1) {
    if (coreSet(kind).has(name)) return name;
    return NAME_SEGMENT_RE.test(name) ? `u:${name}` : null;
  }
  const prefix = name.slice(0, i);
  const rest = name.slice(i + 1);
  switch (prefix) {
    case 'core':
      return coreSet(kind).has(rest) ? rest : null;
    case 'sys':
    case 'u':
      return NAME_SEGMENT_RE.test(rest) ? name : null;
    case 'pack': {
      const j = rest.indexOf('/');
      if (j <= 0) return null;
      return PACK_ID_RE.test(rest.slice(0, j)) && NAME_SEGMENT_RE.test(rest.slice(j + 1)) ? name : null;
    }
    default:
      return null;
  }
}

/** Comparison key of a TYPE as stored on a record: canonical, or the raw string when it is not a legal name. */
export const typeKey = (name: string): string => canonicalName('type', name) ?? name;
/** Comparison key of a PREDICATE as stored on an edge. */
export const predicateKey = (name: string): string => canonicalName('predicate', name) ?? name;

/** Two spellings of the same predicate (`lives-in` ≡ `u:lives-in`, `core:about` ≡ `about`). */
export const samePredicate = (a: string, b: string): boolean => predicateKey(a) === predicateKey(b);
export const sameType = (a: string, b: string): boolean => typeKey(a) === typeKey(b);

/** R-1.9: a request value in a REF position (scope, edge target, derived_from) that is a layer name. */
export const isNameLikeRef = (s: unknown): boolean =>
  typeof s === 'string' && NAME_LAYER_PREFIXES.some((p) => s.startsWith(p));

export type DefCheck = { ok: true; canonical: string } | { ok: false; reason: string };

/**
 * Who may DEFINE which names (R-1.3): core — only `system:genesis`; `sys:<n>` — any `sys:*` writer;
 * `pack:<id>/<n>` — only `pack:<id>`; `u:<n>` — `user:` / `agent:` / `cli:`. Everything else is refused.
 */
export function checkDefinition(kind: DefKind, name: unknown, writer: unknown): DefCheck {
  const canonical = canonicalName(kind, name);
  if (canonical === null) return { ok: false, reason: 'invalid-name' };
  const scheme = principalScheme(writer);
  if (scheme === null) return { ok: false, reason: 'invalid-writer' };
  const i = canonical.indexOf(':');
  if (i === -1) return writer === GENESIS_ACTOR ? { ok: true, canonical } : { ok: false, reason: 'core-name-not-genesis' };
  const prefix = canonical.slice(0, i);
  if (prefix === 'sys') return scheme === 'sys' ? { ok: true, canonical } : { ok: false, reason: 'sys-name-not-sys-writer' };
  if (prefix === 'pack') {
    const packId = canonical.slice(i + 1, canonical.indexOf('/'));
    return writer === `pack:${packId}` ? { ok: true, canonical } : { ok: false, reason: 'pack-name-other-writer' };
  }
  // u:
  return scheme === 'user' || scheme === 'agent' || scheme === 'cli'
    ? { ok: true, canonical }
    : { ok: false, reason: 'u-name-not-user-writer' };
}

/** Node id prefix of a def kind. */
export const defNodeIdFor = (kind: DefKind, canonical: string): string =>
  kind === 'type' ? typeDefId(canonical) : predicateDefId(canonical);
