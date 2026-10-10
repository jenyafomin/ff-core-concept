// @ff/brain/domain/definitions — the ONE regular write path of type-def / predicate-def acts
// (SPEC-brain-data-doors R-1.4, R-1.6). Genesis (`writeGenesis`), the R1 `sys:` seed and the future pack
// installer go through `planDefinition`; a refused definition writes NOTHING. The registry fold re-checks every
// def act it reads (registry.ts) — that is the defense against bypasses (appendRaw, a direct `engine.write`).
import type { Act } from '@ff/engine';

import type { BrainError } from '../contract.js';

import type { PredicateDef, TypeDef } from './genesis.js';
import { checkDefinition, defNodeIdFor, type DefKind } from './names.js';
import { hasAuthorFlags, type Registry } from './registry.js';
import { brainError, buildPredicateDefAct, buildTypeDefAct } from './to-act.js';

export type DefinitionInput = { kind: 'type'; def: TypeDef } | { kind: 'predicate'; def: PredicateDef };

export interface DefinitionPlan {
  kind: DefKind;
  canonical: string;
  /** The def node (stable across versions and alias spellings — R-1.6). */
  nodeId: string;
  act: Act;
}

/**
 * The ONE regular path of a type-def / predicate-def act (R-1.4): genesis, the R1 `sys:` seed and the future
 * pack installer all go through here. Refused → WRITE_DENIED and nothing is written. The def is written under
 * its canonical name into the node of the FIRST accepted def of that name (`typedef:idea` stays the node of
 * `u:idea@2` — identity survives the alias, R-1.6).
 */
export function planDefinition(
  input: DefinitionInput,
  writer: string,
  registry: Pick<Registry, 'defNodeId'>,
  opts: { now: Date; actId?: string },
): DefinitionPlan | BrainError {
  const check = checkDefinition(input.kind, input.def.name, writer);
  if (!check.ok) {
    return brainError('WRITE_DENIED', `definition of ${input.kind} '${String(input.def.name)}' by '${writer}' refused: ${check.reason}`);
  }
  // SPEC-R1 R-01: max_bytes / verbatim / pattern are schema-author-only — a `u:` def may not grant them
  if (input.kind === 'type' && check.canonical.startsWith('u:') && hasAuthorFlags(input.def)) {
    return brainError('WRITE_DENIED', `definition of type '${check.canonical}' refused: max_bytes/verbatim/pattern are schema-author-only`);
  }
  const nodeId = registry.defNodeId(input.kind, check.canonical) ?? defNodeIdFor(input.kind, check.canonical);
  const base = { now: opts.now, actor: writer, nodeId, ...(opts.actId ? { actId: opts.actId } : {}) };
  const act =
    input.kind === 'type'
      ? buildTypeDefAct({ ...input.def, name: check.canonical }, base)
      : buildPredicateDefAct({ ...input.def, name: check.canonical }, base);
  return { kind: input.kind, canonical: check.canonical, nodeId, act };
}
