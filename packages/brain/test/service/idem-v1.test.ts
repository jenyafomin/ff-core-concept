// SPEC-brain-data-doors door 3 — idem v1 frozen + the inbound message id (AC-D12…AC-D14; ADR-0016 D10).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { Act } from '@ff/engine';

import { computeIdem } from '../../../brain-mcp/src/ordinal.js';
import { IDEM_V1, IdemIndex, idemKey, idemStamp } from '../../src/service/idem.js';
import { argsHash } from '../../src/service/runtime.js';
import type { RunningBrain } from '../../src/service/server.js';
import { THREAD_BRAIN, type BrainFixture } from '../support/brain-fixture.js';

import { journalActs, makeHome, ownerClient, start, userRecords } from './_helpers.js';

let fx: BrainFixture;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  b = undefined;
  fx?.cleanup();
});

describe('AC-D12: the inbound message id makes a fresh brain-mcp process idempotent', () => {
  it('same FF_BRAIN_MESSAGE_ID in a new client process → 1 act, dedup:true; another message id → another key', async () => {
    fx = makeHome();
    b = await start(fx);
    const req = { type: 'task', label: 'Один раз' } as const;
    const first = await ownerClient(fx, '9001').record(req); // process 1 of the turn
    const n = b.service.brain.store.acts().length;
    const again = await ownerClient(fx, '9001').record(req); // the gateway re-runs the turn: new process, same message id
    expect(b.service.brain.store.acts().length).toBe(n);
    expect(again).toEqual({ ...first, dedup: true });

    const other = await ownerClient(fx, '9002').record(req);
    expect(other.ok && other.dedup).toBe(false);
    expect(other.ok && first.ok && other.id !== first.id).toBe(true);
    expect(computeIdem(THREAD_BRAIN, '9001', 'record', 1)).not.toBe(computeIdem(THREAD_BRAIN, '9002', 'record', 1));
    expect(userRecords(b).map((r) => r.label)).toEqual(['Один раз', 'Один раз']);
  });
});

describe('AC-D13: reader-first — non-v1 stamps are skipped and counted', () => {
  it('fixture of 3 acts: i2:abc, zzz, a valid v1 → skippedStamps 2, the v1 key dedups', () => {
    const key = idemKey(THREAD_BRAIN, computeIdem(THREAD_BRAIN, '1', 'record', 1)!);
    const mk = (n: number, idem: string): Act => ({
      id: `a_idem${n}`,
      actor: 'user:owner',
      actKind: 'domain_event',
      recordedAt: `2026-10-09T10:00:0${n}.000Z`,
      provenance: { source_ref: `u_idem${n}`, schema_v: 1, type: 'note', type_v: 1, idem },
      payload: { type: 'note', label: `n${n}`, meta: { status: 'active' } },
      edges: [],
    });
    const acts = [mk(1, 'i2:abc'), mk(2, 'zzz'), mk(3, idemStamp(key, 'abcd'))];
    const idx = IdemIndex.fromJournal({ acts: () => acts, readNode: () => null });
    expect(idx.skippedStamps).toBe(2);
    expect(idx.size).toBe(1);
    expect(idx.get(key)).toMatchObject({ verb: 'record', res: { id: 'u_idem3', dedup: true }, body: 'abcd' });
  });
});

describe('AC-D14: the journaled stamp is byte-equal to the frozen v1 formula', () => {
  it('provenance.idem = sha256(dialog \\n sha256(conv␀msg␀verb␀ordinal)) + "." + body tag', async () => {
    fx = makeHome();
    b = await start(fx);
    const req = { type: 'note', label: 'Формула' };
    const r = await ownerClient(fx, '7001').record(req);
    expect(r.ok).toBe(true);
    const secret = readFileSync(join(fx.home, 'secret'), 'utf8').trim();
    const client = computeIdem(THREAD_BRAIN, '7001', 'record', 1)!;
    expect(client).toBe(
      createHash('sha256').update([THREAD_BRAIN, '7001', 'record', '1'].join(IDEM_V1.clientSeparator)).digest('hex'),
    );
    const server = createHash('sha256').update(`${THREAD_BRAIN}${IDEM_V1.serverSeparator}${client}`).digest('hex');
    const expected = `${server}.${argsHash(req, secret)}`;
    expect(expected).toMatch(IDEM_V1.stamp);
    const act = journalActs(fx).find((a) => a.provenance?.source_ref === (r.ok ? r.id : ''));
    expect(act.provenance.idem).toBe(expected);
  });
});
