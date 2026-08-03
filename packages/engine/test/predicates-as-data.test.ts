/**
 * predicates-as-data.test — GAP 2 / G1: the kernel ships ZERO domain predicates; cardinality is TENANT
 * data injected at the store/reducer seam. Three locks:
 *   A. the kernel default registry is EMPTY and the pure reducer folds correctly with a NEUTRAL registry;
 *   B. a tenant registers a predicate the engine has never heard of — via `new MemoryStore(nodes, reg)` —
 *      and its `one`-relation replaces, with NO edit to engine source (the G2 "second-tenant" gate);
 *   C. a grep-lint: no ga-rentacar domain noun appears anywhere under packages/engine/src (G1 boundary).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  Engine,
  MemoryStore,
  FIXED_POLICY,
  DEFAULT_PREDICATES,
  foldInto,
  project,
  type Act,
  type Edge,
  type EnvelopeNode,
  type PredicateRegistry,
} from '../src/index.js';

const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read: [], protected_namespaces: [], default: 'deny' },
};

function domainEvent(id: string, source_ref: string, snapshotHash: string, edges: Edge[]): Act {
  return { id, actor: 'sync:test', provenance: { source_ref, snapshotHash }, recordedAt: '', actKind: 'domain_event', edges, payload: { type: 'record' } };
}

describe('A — kernel default is EMPTY; the reducer folds correctly with a neutral (non-domain) registry', () => {
  it('DEFAULT_PREDICATES is {} — the engine knows no domain noun', () => {
    expect(DEFAULT_PREDICATES).toEqual({});
  });

  it('a hand-built neutral registry drives `one` (replace) and `many` (accumulate) with no kernel default', () => {
    const registry: PredicateRegistry = { alpha: 'one', beta: 'many' };
    const proj = new Map<string, EnvelopeNode>();
    foldInto(proj, domainEvent('a', 'n:1', 'h1', [{ predicate: 'alpha', target: 't:A' }, { predicate: 'beta', target: 'tag:1' }]), registry);
    foldInto(proj, domainEvent('b', 'n:1', 'h2', [{ predicate: 'alpha', target: 't:B' }, { predicate: 'beta', target: 'tag:2' }]), registry);
    const node = proj.get('n:1')!;
    expect(node.edges!.filter((e) => e.predicate === 'alpha')).toHaveLength(1); // one → replaced
    expect(node.edges!.find((e) => e.predicate === 'alpha')?.target).toBe('t:B');
    expect(node.edges!.filter((e) => e.predicate === 'beta').map((e) => e.target)).toEqual(['tag:1', 'tag:2']); // many → accumulate

    // Without a registry (kernel default {}), the SAME predicate folds as `many` — proving the cardinality
    // came from the tenant's data, not from the engine.
    const bare = project([
      domainEvent('a', 'n:2', 'h1', [{ predicate: 'alpha', target: 't:A' }]),
      domainEvent('b', 'n:2', 'h2', [{ predicate: 'alpha', target: 't:B' }]),
    ]);
    expect(bare.get('n:2')!.edges!.filter((e) => e.predicate === 'alpha')).toHaveLength(2); // no registry ⇒ many
  });
});

describe('B — a tenant registers a NEW predicate via the store, without editing engine source (G2)', () => {
  it('an unknown `one` predicate injected at MemoryStore construction replaces through Engine.write', () => {
    // `attends` is a predicate the engine has never heard of (a health/calendar tenant's vocabulary).
    const tenantRegistry: PredicateRegistry = { attends: 'one' };
    const store = new MemoryStore([MIN_CONSTITUTION], tenantRegistry);
    const engine = new Engine(store, FIXED_POLICY);
    engine.write(domainEvent('e1', 'visit:1', 'h1', [{ predicate: 'attends', target: 'doctor:X' }]));
    engine.write(domainEvent('e2', 'visit:1', 'h2', [{ predicate: 'attends', target: 'doctor:Y' }])); // supersede
    const node = store.load().find((n) => n.id === 'visit:1')!;
    const attends = node.edges!.filter((e) => e.predicate === 'attends');
    expect(attends).toHaveLength(1); // `one` → replaced, not duplicated
    expect(attends[0]!.target).toBe('doctor:Y');
  });
});

describe('C — G1 boundary lock: no ga-rentacar domain noun anywhere under packages/engine/src', () => {
  const NOUNS = ['rented', 'drives', 'paid-against', 'for-car', 'for-customer'];
  const SRC = fileURLToPath(new URL('../src', import.meta.url));

  function walk(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walk(p));
      else if (entry.name.endsWith('.ts')) files.push(p);
    }
    return files;
  }

  it('the engine kernel source is free of tenant vocabulary (a tenant registers predicates as DATA)', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const noun of NOUNS) {
        if (text.includes(noun)) offenders.push(`${file} contains "${noun}"`);
      }
    }
    expect(offenders, `G1 leak — tenant nouns found in engine/src:\n${offenders.join('\n')}`).toEqual([]);
  });
});
