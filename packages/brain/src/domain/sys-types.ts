// @ff/brain/domain/sys-types — the platform's own `sys:` vocabulary and its seed (SPEC-brain-r1-prompt-layers
// R-01, R-02, R-04; ADR-0017 D1 / F6). The ONE place in src that names `sys:` types/predicates (genesis.ts stays
// the only home of CORE names — AC-14).
//
//   sys:prompt-layer@1  body (verbatim, ≤32 KB) · priority · merge append|prepend|replace · slot primary|extra
//                       approval: owner → an agent-authority writer only ever PROPOSES a layer
//   sys:target@1        kind (open vocabulary) · key (opaque + pattern: Telegram ids pass)   write: owner
//   sys:lens@1          lens_id · version · shape compose · spec (text-JSON)                  write: owner
//   sys:applies-to      many, prompt-layer → target (AND semantics in the lens)
//   scope sys-gateway   the area of the gateway's kitchen
//   lens prompt-compose@1  — the composition rule as DATA (read/lens.ts interprets it)
//
// Seeded by `sys:brain` on every start, idempotently: defs through `planDefinition` (the one def path), the
// scope and the lens as deterministic system nodes (`scope:sys-gateway`, `lens:prompt-compose@1`) → a restart
// writes 0 acts.
import type { Act, Engine, StorePort } from '@ff/engine';

import type { Reader } from '../contract.js';

import { planDefinition } from './definitions.js';
import { ID_PREFIX, K, scopeId, type FieldSpec, type PredicateDef, type ScopeSeed, type TypeDef } from './genesis.js';
import { seededActId } from './ids.js';
import { READABLE_SCOPED } from './pii-scope.js';
import type { Registry } from './registry.js';
import { buildRecordAct, buildScopeAct, makeEdge } from './to-act.js';

/** The brain service itself (seeds, friction). */
export const SYS_BRAIN = 'sys:brain';
/** The gateway mandate principal (`gateway.token`, R-03). */
export const SYS_GATEWAY = 'sys:gateway';

export const SYS = {
  types: {
    promptLayer: 'sys:prompt-layer',
    target: 'sys:target',
    lens: 'sys:lens',
  },
  preds: {
    appliesTo: 'sys:applies-to',
  },
  /** Scope slug of the gateway's kitchen (`scope:sys-gateway`). */
  scope: 'sys-gateway',
} as const;

/** `sys:target.key`: chat `<chatId>`, topic `<chatId>:<threadId>`, bot id, user id … (Telegram ids are digits). */
export const TARGET_KEY_PATTERN = '^[A-Za-z0-9_:.-]{1,64}$';
/** `sys:prompt-layer.body` ceiling (R-01): the real maximum today is ~12 KB. */
export const PROMPT_LAYER_BODY_MAX_BYTES = 32 * 1024;

const text = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'text', ...extra });
const enumOf = (values: string[], extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'enum', values, ...extra });

export const SYS_TYPES: readonly TypeDef[] = [
  {
    name: SYS.types.promptLayer,
    version: 1,
    status: 'active',
    pii: 'none',
    approval: 'owner',
    label_hint: 'чей слой: «Промпт чата», «Промпт темы»',
    fields: {
      body: text({ max_bytes: PROMPT_LAYER_BODY_MAX_BYTES, verbatim: true }),
      priority: { kind: 'number', default: 0 },
      merge: enumOf(['append', 'prepend', 'replace'], { default: 'append' }),
      slot: enumOf(['primary', 'extra'], { default: 'extra' }),
    },
  },
  {
    name: SYS.types.target,
    version: 1,
    status: 'active',
    pii: 'none',
    write: 'owner',
    label_hint: 'вид цели без id: «Цель: чат»',
    fields: {
      kind: text({ required: true, pattern: '^[a-z][a-z0-9-]{0,31}$' }),
      key: text({ required: true, opaque: true, pattern: TARGET_KEY_PATTERN }),
    },
  },
  {
    name: SYS.types.lens,
    version: 1,
    status: 'active',
    pii: 'none',
    write: 'owner',
    // a lens revision is a NEW node `lens:<lens_id>@<version>` written as data by the mandate; `@1` stays immutable
    versioned_node: { prefix: ID_PREFIX.lens, id_field: 'lens_id', version_field: 'version' },
    fields: {
      lens_id: text({ required: true, pattern: '^[a-z][a-z0-9-]{0,47}$' }),
      version: { kind: 'number', required: true },
      shape: enumOf(['compose'], { required: true }),
      spec: text({ required: true, verbatim: true }),
    },
  },
];

export const SYS_PREDICATES: readonly PredicateDef[] = [
  {
    name: SYS.preds.appliesTo,
    cardinality: 'many',
    from_hint: [SYS.types.promptLayer],
    to_hint: [SYS.types.target],
    meaning: 'слой промпта применяется к цели (все цели слоя — И)',
    status: 'active',
  },
];

export const SYS_SCOPE: ScopeSeed = { slug: SYS.scope, name: 'Кухня шлюза', kind: 'project', pii: 'none' };

/** The compose spec of `lens:prompt-compose@1` (R-05 interprets it). */
export interface ComposeSpec {
  from: string;
  via: string;
  order: string[];
  filter: { status: 'active' };
  separator: string;
}

export const PROMPT_COMPOSE_SPEC: ComposeSpec = {
  from: SYS.types.promptLayer,
  via: SYS.preds.appliesTo,
  order: ['bot', 'project', 'agent', 'chat', 'topic', 'user'],
  filter: { status: 'active' },
  separator: '\n\n',
};

export const PROMPT_COMPOSE_LENS = { lens_id: 'prompt-compose', version: 1 } as const;

/** Node id of a seeded lens: `lens:<lens_id>@<version>` (system data — never a user record, never in find). */
export const lensNodeId = (lensId: string, version: number): string => `${ID_PREFIX.lens}${lensId}@${version}`;

export const PROMPT_COMPOSE_LENS_ID = lensNodeId(PROMPT_COMPOSE_LENS.lens_id, PROMPT_COMPOSE_LENS.version);

/**
 * The reader of a service principal (never from readers.json): owner AUTHORITY, the `sys-gateway` scope, write.
 * `sys:brain` — in-process seeds; `sys:gateway` — the gateway mandate (R-03).
 */
export function serviceReader(principal: typeof SYS_BRAIN | typeof SYS_GATEWAY): Reader {
  return {
    kind: 'service',
    key: principal,
    principal,
    scopes: [SYS.scope],
    default_scope: SYS.scope,
    write: true,
    personal: false,
    idem: false,
    authority: 'owner',
  };
}

/**
 * Seed the `sys:` DEFINITIONS as `sys:brain` (R-02), skipping any name/version already in the registry.
 * Returns acts written. The caller rebuilds the registry (and the engine's admission schemas) when > 0.
 */
export function writeSysDefinitions(
  engine: Pick<Engine, 'write'>,
  registry: Pick<Registry, 'type' | 'predicate' | 'defNodeId'>,
  opts: { now: Date },
): number {
  let written = 0;
  const put = (plan: ReturnType<typeof planDefinition>, what: string) => {
    if ('ok' in plan) throw new Error(`sys seed: ${what} refused: ${plan.message}`);
    const ack = engine.write(plan.act);
    if (!ack.ok) throw new Error(`sys seed: ${what} refused by the engine: ${ack.reason}`);
    if (!ack.dedup) written += 1;
  };
  for (const def of SYS_TYPES) {
    if (registry.type(def.name, def.version)) continue;
    put(planDefinition({ kind: 'type', def }, SYS_BRAIN, registry, opts), def.name);
  }
  for (const def of SYS_PREDICATES) {
    if (registry.predicate(def.name)) continue;
    put(planDefinition({ kind: 'predicate', def }, SYS_BRAIN, registry, opts), def.name);
  }
  return written;
}

/** Seed the `sys-gateway` scope and the `prompt-compose@1` lens node as `sys:brain` (after the defs are in the registry). */
export function writeSysRecords(deps: { engine: Pick<Engine, 'write'>; store: Pick<StorePort, 'readNode'>; now: Date }): number {
  let written = 0;
  const now = deps.now;
  const scopeAct = buildScopeAct(SYS_SCOPE, { now, actor: SYS_BRAIN });
  const scopeRef = (scopeAct.provenance as { source_ref: string }).source_ref;
  if (!deps.store.readNode(scopeRef)) {
    const ack = deps.engine.write(scopeAct);
    if (!ack.ok) throw new Error(`sys seed: scope refused: ${ack.reason}`);
    written += 1;
  }
  if (!deps.store.readNode(PROMPT_COMPOSE_LENS_ID)) {
    const ack = deps.engine.write(buildLensAct(now));
    if (!ack.ok) throw new Error(`sys seed: lens refused by the engine: ${ack.reason}`);
    written += 1;
  }
  return written;
}

/**
 * The `prompt-compose@1` lens act: a record-shaped body (type `sys:lens`, meta, `in-scope → sys-gateway`, owner
 * `sys:brain`) under the deterministic node `lens:prompt-compose@1`. Constant seed data — the engine admission
 * still scans it; a revision of the rule is a NEW version node (`…@2`), the old one stays (V2/V4).
 */
export function buildLensAct(
  now: Date,
  lens: { lens_id: string; version: number } = PROMPT_COMPOSE_LENS,
  spec: ComposeSpec = PROMPT_COMPOSE_SPEC,
): Act {
  const iso = now.toISOString();
  const id = lensNodeId(lens.lens_id, lens.version);
  const edgeMeta = { author: SYS_BRAIN, status: 'active' as const, created_at: iso };
  return buildRecordAct({
    id,
    actId: seededActId(id),
    actor: SYS_BRAIN,
    type: SYS.types.lens,
    type_v: 1,
    label: 'Линза: сборка промпта',
    fields: { lens_id: lens.lens_id, version: lens.version, shape: 'compose', spec: JSON.stringify(spec) },
    meta: { status: 'active', visibility: 'scoped', author: SYS_BRAIN, created_at: iso, updated_at: iso, type_v: 1, pinned: false, temperature: 'hot' },
    readable_by: READABLE_SCOPED,
    edges: [makeEdge(id, K.preds.inScope, scopeId(SYS.scope), edgeMeta), makeEdge(id, K.preds.owner, SYS_BRAIN, edgeMeta)],
    now,
    extras: { authority: 'owner' },
  });
}
