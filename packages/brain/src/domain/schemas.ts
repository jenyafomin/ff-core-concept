// @ff/brain/domain/schemas — the engine wiring of the brain: `BRAIN_SCHEMAS` (PII options, R-9), the
// FIXED_POLICY Engine, genesis writing and the two-pass boot (R-3).
//
//   pass 1: scanJournalRegistry(journal.jsonl) → registry (+ genesis overlay on a fresh journal) → cardinalities
//   pass 2: new DurableFsStore(storeDir, brainBase(), cardinalities, {onBadLine, onTornTail})
//           new Engine(store, FIXED_POLICY, brainSchemas(registry))
//   then:   writeGenesis (idempotent: a present source_ref is skipped → second boot = 0 acts)
//   then:   Registry.fromActs(store.acts()) — the SAME fold as pass 1 (R-1.5); refused defs → registry.rejected
//
// Torn-tail backup+truncation and friction for bad lines are the SERVICE's job (C1), before/around boot.
import { join } from 'node:path';

import {
  DurableFsStore,
  Engine,
  FIXED_POLICY,
  type ActSchema,
  type DurableFsStoreOptions,
} from '@ff/engine';

import type { Act } from '@ff/engine';

import { BRAIN_HOME_LAYOUT, type BrainError, type ClockPort } from '../contract.js';

import { brainBase } from './constitution.js';
import { planDefinition, type DefinitionPlan } from './definitions.js';
import { GENESIS_ACTOR, GENESIS_PREDICATES, GENESIS_TYPES, type ScopeSeed } from './genesis.js';
import { systemClock } from './ids.js';
import { Registry, scanJournalRegistry } from './registry.js';
import { writeSysDefinitions, writeSysRecords } from './sys-types.js';
import { buildScopeAct } from './to-act.js';

/**
 * Keys that are NOT PII by name for brain acts (value still scanned — AC-31): `name` of a person / scope /
 * type-def / predicate-def. Field NAMES, not type names (AC-14 is about types/predicates).
 */
export const BRAIN_ALLOW_KEYS: readonly string[] = ['name'];

/** The brain's ActSchema set. All brain acts are `domain_event`; other actKinds keep engine defaults. */
export function brainSchemas(registry: Registry): ActSchema[] {
  return [
    {
      actKind: 'domain_event',
      piiFields: [],
      allowKeys: [...BRAIN_ALLOW_KEYS],
      opaqueValueKeys: registry.opaqueFieldNames(),
      fieldPolicies: registry.fieldPolicies(),
    },
  ];
}

/** Engine over the brain store: FIXED policy only (the engine refuses anything else). */
export function createBrainEngine(store: DurableFsStore, registry: Registry): Engine {
  return new Engine(store, FIXED_POLICY, brainSchemas(registry));
}

/**
 * Write the genesis package; entries whose node already exists are skipped. Returns acts written.
 * Type/predicate defs go through `planDefinition` as `system:genesis` (R-1.4) — the acts are byte-identical
 * to `genesisActs` (same node ids, same seeded act ids), so an existing journal still skips them.
 */
export function writeGenesis(
  engine: Engine,
  store: Pick<DurableFsStore, 'readNode'>,
  opts: { now: Date; scopes?: ScopeSeed[]; registry?: Pick<Registry, 'defNodeId'> },
): number {
  const registry = opts.registry ?? new Registry();
  const acts: Act[] = [];
  for (const def of GENESIS_TYPES) acts.push(definitionAct(planDefinition({ kind: 'type', def }, GENESIS_ACTOR, registry, opts)));
  for (const def of GENESIS_PREDICATES) acts.push(definitionAct(planDefinition({ kind: 'predicate', def }, GENESIS_ACTOR, registry, opts)));
  for (const seed of opts.scopes ?? []) acts.push(buildScopeAct(seed, { now: opts.now }));
  let written = 0;
  for (const act of acts) {
    const ref = (act.provenance as { source_ref: string }).source_ref;
    if (store.readNode(ref)) continue;
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`genesis act for ${ref} refused: ${ack.reason}`);
    if (!ack.dedup) written += 1;
  }
  return written;
}

function definitionAct(plan: DefinitionPlan | BrainError): Act {
  if ('ok' in plan) throw new Error(`genesis definition refused: ${plan.message}`);
  return plan.act;
}

export interface BootOptions {
  /** `~/.ff-brain/store` (holds journal.jsonl). */
  storeDir: string;
  onBadLine?: DurableFsStoreOptions['onBadLine'];
  onTornTail?: DurableFsStoreOptions['onTornTail'];
  /** Scopes to seed with genesis (owner's list, R-10). Existing scope ids are left alone. */
  scopes?: ScopeSeed[];
  clock?: ClockPort;
}

export interface BrainDomain {
  store: DurableFsStore;
  engine: Engine;
  /** Registry rebuilt from the journal AFTER genesis (the one validation uses). */
  registry: Registry;
  genesisWritten: number;
  /** `sys:` seed acts written on this boot (SPEC-R1 R-02): 6 on a fresh journal, 0 on a restart. */
  sysSeedWritten: number;
  journalPath: string;
}

/** Two-pass start (R-3). Throws DurableStoreError if another writer holds the lock (AC-20). */
export function bootBrain(opts: BootOptions): BrainDomain {
  const journalPath = join(opts.storeDir, BRAIN_HOME_LAYOUT.journal.split('/').pop()!);
  const clock = opts.clock ?? systemClock;

  // pass 1 — registry straight from the file (the store is not open yet)
  const scanned = scanJournalRegistry(journalPath).registry;
  // genesis not journaled yet → overlay its defs so the store opens with the right cardinalities
  if (!scanned.hasGenesis()) scanned.withGenesisDefaults();

  // pass 2 — open the store with the journal's cardinalities
  const storeOpts: DurableFsStoreOptions = {};
  if (opts.onBadLine) storeOpts.onBadLine = opts.onBadLine;
  if (opts.onTornTail) storeOpts.onTornTail = opts.onTornTail;
  const store = new DurableFsStore(opts.storeDir, brainBase(), scanned.cardinalities(), storeOpts);
  try {
    let engine = createBrainEngine(store, scanned);
    const genesisOpts: { now: Date; scopes?: ScopeSeed[]; registry: Registry } = { now: clock.now(), registry: scanned };
    if (opts.scopes) genesisOpts.scopes = opts.scopes;
    const genesisWritten = writeGenesis(engine, store, genesisOpts);
    let registry = Registry.fromActs(store.acts());
    // SPEC-R1 R-02: the `sys:` vocabulary (after genesis, as `sys:brain`); new defs → rebuild the registry AND
    // the engine (its admission schemas carry the per-type field policies of the new defs)
    const sysDefs = writeSysDefinitions(engine, registry, { now: clock.now() });
    if (sysDefs > 0) {
      registry = Registry.fromActs(store.acts());
      engine = createBrainEngine(store, registry);
    }
    const sysRecords = writeSysRecords({ engine, store, now: clock.now() });
    return { store, engine, registry, genesisWritten, sysSeedWritten: sysDefs + sysRecords, journalPath };
  } catch (e) {
    store.close();
    throw e;
  }
}
