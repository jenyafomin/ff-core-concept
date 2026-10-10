// SPEC-brain-data-doors door 5 — authority from the credential, not the request (AC-D20…AC-D23).
import { afterEach, describe, expect, it } from 'vitest';

import { planDefinition, type TypeDef } from '../../src/domain/index.js';
import { resolveReader } from '../../src/read/access.js';
import type { RunningBrain } from '../../src/service/server.js';
import { CLI_CWD, defaultReaders, FIXED_NOW, ownerInTopic, type BrainFixture } from '../support/brain-fixture.js';
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

/** A test stand-in for the gateway mandate (SPEC-R1 R-03): the only kind of reader with owner authority. */
const gateway = () => topicReader({ principal: 'sys:gateway', authority: 'owner' });
const provOf = (br: Brain, id: string) =>
  br.acts().filter((a) => (a.provenance as { source_ref?: string }).source_ref === id).map((a) => a.provenance as Record<string, unknown>);

describe('AC-D20: the main token is agent authority, always', () => {
  it('resolveReader: chat with principal user:owner and CLI → authority agent', () => {
    const chat = resolveReader(defaultReaders(), ownerInTopic());
    expect(chat).toMatchObject({ principal: 'user:owner', authority: 'agent' });
    const cli = resolveReader(defaultReaders(), { cwd: CLI_CWD });
    expect(cli).toMatchObject({ authority: 'agent' });
  });

  it('a forged header or body field does not raise authority (over the wire)', async () => {
    fx = makeHome();
    svc = await start(fx);
    const p = await ownerClient(fx, '601').record({ type: 'task', label: 'Предложение', initiative: 'agent' });
    expect(p.ok && p.status).toBe('proposed');
    const id = p.ok ? p.id : '';
    const forged = await raw(fx, BRAIN_ROUTES.record, { id, type: 'task', label: 'Предложение', initiative: 'owner' }, {
      headers: { ...ownerHeaders('602'), 'x-ff-brain-authority': 'owner', 'x-ff-brain-principal': 'sys:gateway' },
    });
    expect(forged.json.code).toBe('WRITE_DENIED');
    const body = await raw(fx, BRAIN_ROUTES.record, { id, type: 'task', label: 'Предложение', authority: 'owner' }, { headers: ownerHeaders('603') });
    expect(body.status).toBe(400);
    const acts = journalActs(fx).filter((a) => a.provenance?.source_ref === id);
    expect(acts).toHaveLength(1);
    expect(acts[0].erasable.meta.status).toBe('proposed');
    expect(acts[0].provenance.authority).toBe('agent');
  });
});

describe('AC-D21: agent authority cannot approve', () => {
  it("initiative 'owner' → WRITE_DENIED; proposed→active refused for every type, status kept", () => {
    b = openBrain();
    const n = b.acts().length;
    expect(err(b.record({ type: 'task', label: 'Сам себе', initiative: 'owner' })).code).toBe('WRITE_DENIED');
    expect(b.acts().length).toBe(n);
    for (const type of ['task', 'note', 'decision', 'unknown-kind']) {
      const p = ok(b.record({ type, label: `Предложение ${type}`, initiative: 'agent' }));
      expect(p.status).toBe('proposed');
      expect(err(b.record({ id: p.id, type, label: `Предложение ${type}`, initiative: 'owner' })).code, type).toBe('WRITE_DENIED');
      expect(b.get(p.id).status).toBe('proposed');
    }
  });

  it("someone else's proposal: an agent may not change its status; its own it may retract", () => {
    b = openBrain();
    const mine = ok(b.record({ type: 'task', label: 'Моё', initiative: 'agent' }));
    expect(ok(b.record({ id: mine.id, retract: true, reason: 'передумал' })).status).toBe('retracted');
    const theirs = ok(b.record({ type: 'task', label: 'Чужое', initiative: 'agent' }, topicReader({ principal: 'agent:other' })));
    expect(err(b.record({ id: theirs.id, retract: true, reason: 'нет' })).code).toBe('WRITE_DENIED');
    expect(b.get(theirs.id).status).toBe('proposed');
    // a plain edit that keeps it proposed is still allowed (no status change)
    expect(ok(b.record({ id: theirs.id, label: 'Чужое (уточнено)' })).status).toBe('proposed');
  });
});

describe('AC-D22: owner authority approves, and the act says so', () => {
  it('sys:gateway reader activates a proposal; provenance.authority = owner (agent acts carry agent)', () => {
    b = openBrain();
    const p = ok(b.record({ type: 'note', label: 'На одобрение', initiative: 'agent' }));
    const a = ok(b.record({ id: p.id, type: 'note', label: 'На одобрение', initiative: 'owner' }, gateway()));
    expect(a.status).toBe('active');
    expect(provOf(b, p.id).map((x) => x.authority)).toEqual(['agent', 'owner']);
    // every reader act carries authority (link too)
    const other = ok(b.record({ type: 'note', label: 'Другая' }));
    ok(b.link({ from: p.id, pred: 'about', to: other.id }));
    expect((b.acts().at(-1)!.provenance as Record<string, unknown>).authority).toBe('agent');
  });
});

describe('AC-D23: approval is policy-as-data on the type', () => {
  it("approval:'owner' → an agent's create is proposed; owner creates active; a genesis type stays active", () => {
    b = openBrain();
    const def: TypeDef = { name: 'u:house-rule', version: 1, status: 'active', fields: { text: { kind: 'text' } }, approval: 'owner' };
    const plan = planDefinition({ kind: 'type', def }, 'user:owner', b.d.registry, { now: FIXED_NOW });
    if ('ok' in plan) throw new Error(plan.message);
    expect(b.d.engine.write(plan.act).ok).toBe(true);
    b.restart();
    expect(b.d.registry.type('u:house-rule')!.approval).toBe('owner');

    const byAgent = ok(b.record({ type: 'u:house-rule', label: 'Правило агента' }));
    expect(byAgent.status).toBe('proposed');
    const byOwner = ok(b.record({ type: 'u:house-rule', label: 'Правило владельца' }, gateway()));
    expect(byOwner.status).toBe('active');
    // v0.6 behaviour kept: a genesis type without the field → agent creates active
    expect(ok(b.record({ type: 'task', label: 'Обычная задача' })).status).toBe('active');
  });
});
