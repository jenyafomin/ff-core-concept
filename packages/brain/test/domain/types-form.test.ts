// Types as FORM (AC-36, AC-37) and the AC-14 grep guard.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { GENESIS_ACTOR, GENESIS_PREDICATES, GENESIS_TYPES, buildTypeDefAct, planDefinition, type TypeDef } from '../../src/domain/index.js';
import { ok, openBrain, type Brain } from './harness.js';

let b: Brain | undefined;
afterEach(() => {
  b?.close();
  b = undefined;
});

describe('type-def form (AC-36)', () => {
  it('candidate + extends + confidence is accepted and returned unchanged; nothing is activated', () => {
    b = openBrain();
    const def: TypeDef = {
      name: 'meeting',
      version: 1,
      status: 'candidate',
      confidence: 0.4,
      extends: 'task@1',
      label_hint: 'встреча',
      fields: { where: { kind: 'text' }, kind: { kind: 'enum', values: ['call', 'live'], default: 'call' } },
      pii: 'none',
    };
    const ack = b.d.engine.write(buildTypeDefAct(def, { now: new Date(), actor: 'user:owner' }));
    expect(ack.ok).toBe(true);
    b.restart();
    // SPEC-brain-data-doors R-1.2 (option A, was name 'meeting'): a bare non-core name is the alias of u:meeting
    expect(b.d.registry.type('meeting')).toEqual({ ...def, name: 'u:meeting' });
    expect(b.d.registry.activeType('meeting')).toBeUndefined();
    // a record of a candidate type is NOT activated: raw + warning
    const r = ok(b.record({ type: 'meeting', label: 'Созвон' }));
    expect(r.type).toBe('raw');
    expect(r.warnings[0]!.code).toBe('UNKNOWN_TYPE_AS_RAW');
    // the projected type-def node returns the def fields verbatim
    const node = b.get('typedef:meeting');
    expect(node.fields).toMatchObject({ status: 'candidate', confidence: 0.4, extends: 'task@1' });
  });
});

describe('type versions (AC-37)', () => {
  it('a record written with type_v=1 reads unchanged after type-def v2 appears; new writes get v2', () => {
    b = openBrain();
    const old = ok(b.record({ type: 'task', label: 'Старая версия', fields: { why: 'v1' } }));
    expect(old.type_v).toBe(1);

    const v1 = b.d.registry.type('task')!;
    const v2: TypeDef = { ...v1, version: 2, fields: { ...v1.fields, effort: { kind: 'number' } } };
    // SPEC-brain-data-doors R-1.3/R-1.4 (option A, was actor 'user:owner' via engine.write): a core type is
    // (re)defined only by system:genesis, through planDefinition
    const plan = planDefinition({ kind: 'type', def: v2 }, GENESIS_ACTOR, b.d.registry, { now: new Date() });
    if ('ok' in plan) throw new Error(plan.message);
    expect(b.d.engine.write(plan.act).ok).toBe(true);
    b.restart();

    expect(b.d.registry.type('task', 1)).toEqual(v1);
    expect(b.d.registry.type('task')?.version).toBe(2);
    const rec = b.get(old.id);
    expect(rec.type_v).toBe(1);
    expect(rec.fields).toMatchObject({ why: 'v1', status: 'open' });

    const fresh = ok(b.record({ type: 'task', label: 'Новая', fields: { effort: 3 } }));
    expect(fresh.type_v).toBe(2);
    expect(b.get(fresh.id).type_v).toBe(2);
  });
});

// ─── AC-14: names only in genesis.ts; no engine view() ──────────────────────────────────────────────

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../src');

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tsFiles(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('AC-14 grep guard', () => {
  // All genesis names except the two that are also wire VOCABULARY in contract.ts (visibility/initiative
  // 'owner', find preset 'scope'); the SPEC §5 grep set (task|decision|note|person|in-scope|member-of) is included.
  const names = [...GENESIS_TYPES.map((t) => t.name), ...GENESIS_PREDICATES.map((p) => p.name)].filter(
    (n) => n !== 'owner' && n !== 'scope',
  );
  const isComment = (line: string) => /^\s*(\/\/|\*|\/\*\*)/.test(line);
  const quoted = new RegExp(`['"\`](${names.map((n) => n.replace(/[-]/g, '\\-')).join('|')})['"\`]`);

  it('type/predicate names appear quoted only in domain/genesis.ts', () => {
    const offenders: string[] = [];
    for (const f of tsFiles(srcRoot)) {
      const rel = relative(srcRoot, f);
      if (rel === join('domain', 'genesis.ts')) continue;
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (!isComment(line) && quoted.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('no `.view(` call in packages/brain/src', () => {
    const offenders = tsFiles(srcRoot).filter((f) => readFileSync(f, 'utf8').includes('.view('));
    expect(offenders.map((f) => relative(srcRoot, f))).toEqual([]);
  });
});
