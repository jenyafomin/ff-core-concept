// SPEC-brain-data-doors door 4 (AC-D19): replay a live brain journal BELOW the Engine into a fresh home →
// bootBrain there → find / read / the idem index are equal to the source brain.
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DurableFsStore, replayJournal } from '@ff/engine';

import { brainBase, scanJournalRegistry } from '../../src/domain/index.js';
import { IdemIndex } from '../../src/service/idem.js';
import type { RunningBrain } from '../../src/service/server.js';
import type { BrainFixture } from '../support/brain-fixture.js';

import { makeHome, ownerClient, start } from './_helpers.js';

process.setMaxListeners(0);

const homes: BrainFixture[] = [];
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  b = undefined;
  while (homes.length) homes.pop()!.cleanup();
});

function idemSnapshot(store: DurableFsStore): Array<[string, unknown]> {
  const idx = IdemIndex.fromJournal(store) as unknown as { answers: Map<string, { verb: string; res: unknown; body?: string }> };
  return [...idx.answers.entries()].map(([k, v]) => [k, { verb: v.verb, res: v.res, body: v.body }] as [string, unknown]).sort();
}

describe('AC-D19: replay → bootBrain → same find / read / idem', () => {
  it('a brain with records, a reclassification, links and idem stamps survives a below-Engine migration', async () => {
    const A = makeHome();
    const B = makeHome();
    homes.push(A, B);

    // ── source brain
    b = await start(A);
    const c = (m: string) => ownerClient(A, m);
    const t = await c('1').record({ type: 'task', label: 'Задача A', fields: { due: '2026-10-20' } });
    const n = await c('2').record({ type: 'note', label: 'Заметка A' });
    const p = await c('3').record({ type: 'decision', label: 'Предложение', initiative: 'agent' });
    if (!t.ok || !n.ok || !p.ok) throw new Error('setup failed');
    await c('4').link({ from: t.id, pred: 'about', to: n.id });
    await c('5').record({ id: n.id, type: 'task', label: 'Заметка A' }); // reclassification (instance-of)
    const ids = [t.id, n.id, p.id];
    const findA = await c('6').find({});
    const readsA = await Promise.all(ids.map((id) => c('7').read({ id, depth: 1 })));
    const idemA = idemSnapshot(b.service.brain.store);
    expect(idemA.length).toBeGreaterThanOrEqual(5);
    const actsA = b.service.brain.store.acts().map((a) => ({ ...a }));
    await b.stop();
    b = undefined;

    // ── replay below the Engine into B (the home's secret travels with it, like the journal)
    const cards = scanJournalRegistry(A.journalPath).registry.cardinalities();
    const target = new DurableFsStore(B.storeDir, brainBase(), cards);
    const report = replayJournal(A.journalPath, target);
    target.close();
    expect(report.bad).toEqual([]);
    expect(report.copied).toBe(actsA.length);
    copyFileSync(join(A.home, 'secret'), join(B.home, 'secret'));

    // ── target brain
    b = await start(B);
    expect(b.service.brain.genesisWritten).toBe(0);
    expect(b.service.brain.store.acts()).toEqual(actsA); // order + recordedAt kept
    const d = (m: string) => ownerClient(B, m);
    expect(await d('6').find({})).toEqual(findA);
    expect(await Promise.all(ids.map((id) => d('7').read({ id, depth: 1 })))).toEqual(readsA);
    expect(idemSnapshot(b.service.brain.store)).toEqual(idemA);
    // and the idem index WORKS on the target: the same inbound message deduplicates
    const again = await d('1').record({ type: 'task', label: 'Задача A', fields: { due: '2026-10-20' } });
    expect(again).toMatchObject({ ok: true, id: t.id, dedup: true });
    expect(b.service.brain.store.acts().length).toBe(actsA.length);
  });
});
