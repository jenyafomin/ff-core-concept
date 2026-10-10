// @ff/brain/domain/principal — the frozen principal format (ADR-0017 D1, SPEC-brain-data-doors R-2.1).
//
//   <scheme>:<id>, scheme ∈ { user · agent · cli · sys · pack }, plus exactly one legacy system principal:
//   `system:genesis` (the genesis writer). Every principal the brain stamps into `actor` / `meta.author` must
//   have this form — the journal is never rewritten, so a malformed principal written once lives forever.
//
//   sys:<id>  — the platform itself (the brain service `sys:brain`, the gateway mandate `sys:gateway`).
//   pack:<id> — a plugin pack; `<id>` shares the pack-id grammar of names.ts (`pack:<id>/<n>`).
//   user/agent/cli — people, agents and CLI cwd bindings (the readers.json world).

import { GENESIS_ACTOR } from './genesis.js';

export const PRINCIPAL_SCHEMES = ['user', 'agent', 'cli', 'sys', 'pack'] as const;
export type PrincipalScheme = (typeof PRINCIPAL_SCHEMES)[number];

/** Id segment of `sys:` / `pack:` principals and of `pack:<id>/<n>` names. */
export const PRINCIPAL_ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** user/agent/cli ids: any printable text without whitespace (cli ids are absolute paths). */
const FREE_ID_RE = /^[^\s\u0000-\u001f\u007f]{1,512}$/;

/** Scheme of a valid principal, or null. `system:genesis` → 'system'. */
export function principalScheme(p: unknown): PrincipalScheme | 'system' | null {
  if (typeof p !== 'string') return null;
  if (p === GENESIS_ACTOR) return 'system';
  const i = p.indexOf(':');
  if (i <= 0) return null;
  const scheme = p.slice(0, i);
  const id = p.slice(i + 1);
  switch (scheme) {
    case 'sys':
    case 'pack':
      return PRINCIPAL_ID_RE.test(id) ? scheme : null;
    case 'user':
    case 'agent':
    case 'cli':
      return FREE_ID_RE.test(id) ? scheme : null;
    default:
      return null;
  }
}

export const isPrincipal = (p: unknown): p is string => principalScheme(p) !== null;

/** A pack principal `pack:<id>` (the value of a binding's `pack` field). */
export const isPackPrincipal = (p: unknown): p is string => principalScheme(p) === 'pack';

/**
 * Principals a readers.json binding may carry (R-2.2): user · agent · cli only. `system:*` is never a
 * binding (genesis is not a reader); `sys:*` comes ONLY from a service credential (gateway mandate, R1 R-03),
 * never from an editable allowlist; `pack:` is delegation, carried in the separate `pack` field.
 */
export function isBindingPrincipal(p: unknown): p is string {
  const s = principalScheme(p);
  return s === 'user' || s === 'agent' || s === 'cli';
}
