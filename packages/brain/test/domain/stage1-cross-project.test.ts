// Stage 1 (roadmap 2026-10-20 §6, steps 5–7) rehearsed on a real store in a tmp home — never ~/.ff-brain.
// Pins the exact config `launch-kit/stage1-scopes.sh` writes:
//   service.json  + scopes `ff`, `agents-manager` (kind project, pii none) next to the existing `personal`
//   readers.json  cli[<FF cwd>]  = write, scopes personal+ff+agents-manager, default ff, personal true
//                 cli[<AM cwd>]  = read-only, scopes ff+agents-manager, personal false
// and the cycle «FF writes the ADR-0016 note → agents-manager finds it and reads the path».
// Also answers the Stage-1 question «does the validator refuse an unknown type?» — NO, by design (AC-35):
// it is stored as `raw` with `declared_type` + warning UNKNOWN_TYPE_AS_RAW (+ friction).
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import type { Reader } from '../../src/contract.js';
import { type ScopeSeed } from '../../src/domain/index.js';
import { find, read, type ReadDeps } from '../../src/read/index.js';
import { err, ok, openBrain, type Brain } from './harness.js';

process.setMaxListeners(0);

const FF_CWD = '/Users/mac16/Documents/IT/Apps/FF-Personal-Managment';
const AM_CWD = '/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager';

/** service.json `scopes` after stage1-scopes.sh (personal kept first, as launch-brain.sh wrote it). */
const STAGE1_SCOPES: ScopeSeed[] = [
  { slug: 'personal', name: 'Личное — дела владельца', kind: 'personal' },
  { slug: 'ff', name: 'FF Personal Management', kind: 'project', pii: 'none' },
  { slug: 'agents-manager', name: 'agents-manager (шлюз)', kind: 'project', pii: 'none' },
];

const cli = (cwd: string, over: Partial<Reader>): Reader => ({
  kind: 'cli',
  key: cwd,
  principal: `cli:${cwd}`,
  scopes: [],
  write: false,
  personal: false,
  idem: false,
  authority: 'agent',
  ...over,
});
const ffReader = () => cli(FF_CWD, { scopes: ['personal', 'ff', 'agents-manager'], default_scope: 'ff', write: true, personal: true });
const amReader = () => cli(AM_CWD, { scopes: ['ff', 'agents-manager'] });

const REF = 'repo:ff/docs/architecture/ADR/ADR-0016-cross-project-brain.md';
const HASH = createHash('sha256').update('ADR-0016 body stand-in').digest('hex');

let b: Brain | undefined;
afterEach(() => {
  b?.close();
  b = undefined;
});

describe('Stage 1: FF writes, agents-manager reads (cli bindings by cwd)', () => {
  it('the ADR-0016 note lands in ff+agents-manager and AM finds it by text and reads the source path', () => {
    b = openBrain({ scopes: STAGE1_SCOPES });
    const deps: ReadDeps = { engine: b.d.engine, store: b.d.store, clock: b.clock };

    const w = ok(
      b.record(
        {
          type: 'note',
          label: 'ADR-0016: один мозг на все проекты',
          fields: { text: 'Один сервис памяти вне проектов (pm2 + MCP); проекты = области; агенты читают через find/read.' },
          scopes: ['ff', 'agents-manager'],
          source: { kind: 'file', ref: REF, hash: HASH },
        },
        ffReader(),
      ),
    );
    expect(w.type).toBe('note');
    expect(w.warnings).toEqual([]);

    const found = ok(find(amReader(), { scope: 'ff', text: 'мозг' }, deps));
    expect(found.items.map((i) => i.id)).toEqual([w.id]);
    expect(found.items[0]?.label).toBe('ADR-0016: один мозг на все проекты');

    const r = ok(read(amReader(), { id: w.id }, deps)) as unknown as { node: { source?: { ref: string; hash?: string } } };
    expect(JSON.stringify(r)).toContain(REF);
    expect(JSON.stringify(r)).toContain(HASH);
  });

  it('AM is read-only, cannot see personal; FF cannot write outside its scopes', () => {
    b = openBrain({ scopes: STAGE1_SCOPES });
    const deps: ReadDeps = { engine: b.d.engine, store: b.d.store, clock: b.clock };
    const mine = ok(b.record({ type: 'task', label: 'Личное дело владельца', scopes: ['personal'] }, ffReader()));

    expect(err(b.record({ type: 'note', label: 'попытка записи из AM', scopes: ['agents-manager'] }, amReader())).code).toBe('WRITE_DENIED');
    expect(ok(find(amReader(), { text: 'Личное' }, deps)).items.map((i) => i.id)).not.toContain(mine.id);
    expect(err(b.record({ type: 'note', label: 'чужая область', scopes: ['acme'] }, ffReader())).ok).toBe(false);
  });

  it('a restart with the same service.json writes no new scopes (stage1-scopes.sh is idempotent at the brain too)', () => {
    b = openBrain({ scopes: STAGE1_SCOPES });
    b.restart();
    expect(b.d.genesisWritten).toBe(0);
    expect(b.d.store.readNode('scope:ff')).toBeTruthy();
    expect(b.d.store.readNode('scope:agents-manager')).toBeTruthy();
  });
});

describe('Stage 1 question: does the validator refuse an unknown type?', () => {
  it('no — an unknown type is kept as raw with declared_type and a UNKNOWN_TYPE_AS_RAW warning', () => {
    b = openBrain({ scopes: STAGE1_SCOPES });
    const w = ok(b.record({ type: 'adr-summary', label: 'ADR-0016 как неизвестный тип', scopes: ['ff'] }, ffReader()));
    expect(w.type).toBe('raw');
    expect(w.warnings.map((x) => x.code)).toContain('UNKNOWN_TYPE_AS_RAW');
    expect(b.get(w.id).fields).toMatchObject({ declared_type: 'adr-summary' });
  });
});
