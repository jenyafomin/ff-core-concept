// SPEC-brain-data-doors door 2 — principal format (AC-D09…AC-D11): `<scheme>:<id>`, readers.json bindings
// validated (DEFAULT_DENY), `pack` delegation stamped into provenance.pack with actor = binding principal.
import { afterEach, describe, expect, it } from 'vitest';

import type { ReadersFile } from '../../src/contract.js';
import { isBindingPrincipal, isPrincipal } from '../../src/domain/index.js';
import { resolveReader } from '../../src/read/access.js';
import type { RunningBrain } from '../../src/service/server.js';
import { defaultReaders, GROUP, ownerInTopic, type BrainFixture } from '../support/brain-fixture.js';
import { BRAIN_ROUTES, journalActs, makeHome, ownerClient, ownerHeaders, raw, start } from '../service/_helpers.js';
import { err, ok, openBrain, topicReader, type Brain } from './harness.js';

let b: Brain | undefined;
let fx: BrainFixture | undefined;
let svc: RunningBrain | undefined;
afterEach(async () => {
  b?.close();
  b = undefined;
  await svc?.stop();
  svc = undefined;
  fx?.cleanup();
  fx = undefined;
});

describe('AC-D09: the frozen principal grammar', () => {
  it('valid / invalid', () => {
    for (const p of ['user:owner', 'agent:p2', 'cli:/x', 'pack:bt', 'sys:gw', 'system:genesis']) expect(isPrincipal(p), p).toBe(true);
    for (const p of ['system:x', 'pack:BT', 'pack:a/b', 'foo:bar', 'owner', 'user:', 'sys:', 'user:a b', '']) expect(isPrincipal(p), p).toBe(false);
    // readers.json may carry only user/agent/cli
    expect(isBindingPrincipal('user:owner')).toBe(true);
    for (const p of ['system:genesis', 'sys:gateway', 'pack:bt']) expect(isBindingPrincipal(p), p).toBe(false);
  });
});

const readersWith = (over: Record<string, unknown>): ReadersFile => {
  const r = defaultReaders();
  r.chats[GROUP] = { ...r.chats[GROUP]!, ...over };
  return r;
};

describe('AC-D10: a malformed binding is DEFAULT_DENY', () => {
  it('principal system:genesis / sys:gateway, pack:"nope" → DEFAULT_DENY; a clean binding resolves', () => {
    for (const over of [{ principal: 'system:genesis' }, { principal: 'sys:gateway' }, { principal: 'owner' }, { pack: 'nope' }, { pack: 'pack:a/b' }]) {
      const r = resolveReader(readersWith(over), ownerInTopic());
      expect('ok' in r && r.code, JSON.stringify(over)).toBe('DEFAULT_DENY');
    }
    const okR = resolveReader(readersWith({ pack: 'pack:bt' }), ownerInTopic());
    expect('ok' in okR).toBe(false);
    expect(okR).toMatchObject({ principal: 'user:owner', pack: 'pack:bt' });
    const cli = defaultReaders();
    cli.cli = { '/tmp/x': { principal: 'system:genesis', scopes: ['scope:brain'], write: true } };
    const r = resolveReader(cli, { cwd: '/tmp/x' });
    expect('ok' in r && r.code).toBe('DEFAULT_DENY');
  });
});

describe('AC-D11: pack delegation', () => {
  it('binding pack → provenance.pack, actor = binding principal; no pack → no field', () => {
    b = openBrain();
    const withPack = ok(b.record({ type: 'note', label: 'От пакета' }, topicReader({ pack: 'pack:bt' })));
    const a1 = b.acts().find((a) => (a.provenance as { source_ref?: string }).source_ref === withPack.id)!;
    expect((a1.provenance as { pack?: string }).pack).toBe('pack:bt');
    expect(a1.actor).toBe('user:owner');
    const plain = ok(b.record({ type: 'note', label: 'Без пакета' }));
    const a2 = b.acts().find((a) => (a.provenance as { source_ref?: string }).source_ref === plain.id)!;
    expect(a2.provenance).not.toHaveProperty('pack');

    ok(b.link({ from: plain.id, pred: 'about', to: withPack.id }, topicReader({ pack: 'pack:bt' })));
    expect((b.acts().at(-1)!.provenance as { pack?: string }).pack).toBe('pack:bt');

    // pack in the body is never accepted
    expect(err(b.record({ type: 'note', label: 'x', pack: 'pack:bt' } as never)).code).toBe('BAD_REQUEST');
    expect(err(b.link({ from: plain.id, pred: 'about', to: withPack.id, pack: 'pack:bt' } as never)).code).toBe('BAD_REQUEST');
  });

  it('over the wire: binding pack stamped, body pack → 400', async () => {
    fx = makeHome(readersWith({ pack: 'pack:bt' }));
    svc = await start(fx);
    const r = await ownerClient(fx, '501').record({ type: 'note', label: 'Через сокет' });
    expect(r.ok).toBe(true);
    const act = journalActs(fx).find((a) => a.provenance?.source_ref === (r.ok ? r.id : ''));
    expect(act.provenance.pack).toBe('pack:bt');
    expect(act.actor).toBe('user:owner');
    const bad = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'x', pack: 'pack:evil' }, { headers: ownerHeaders('502') });
    expect(bad.status).toBe(400);
  });
});
