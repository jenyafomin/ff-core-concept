// SPEC-brain-r1-prompt-layers: the `sys:` vocabulary and its seed (AC-R01), field flags max_bytes / verbatim /
// pattern + the 64 KB act cap (AC-R02, R-01), credential-derived status of sys types (AC-R03, R-04 ∧ door 5) and
// opaque Telegram keys (AC-R09).
import { afterEach, describe, expect, it } from 'vitest';

import type { Reader } from '../../src/contract.js';
import {
  PROMPT_COMPOSE_LENS_ID,
  PROMPT_COMPOSE_SPEC,
  SYS,
  SYS_BRAIN,
  SYS_GATEWAY,
  SYS_PREDICATES,
  SYS_TYPES,
  Registry,
  decodeNode,
  planDefinition,
  serviceReader,
  type TypeDef,
} from '../../src/domain/index.js';
import { readersLoader } from '../../src/service/readers.js';
import { defaultReaders } from '../support/brain-fixture.js';
import { err, ok, openBrain, topicReader, type Brain } from './harness.js';

let b: Brain | undefined;
afterEach(() => {
  b?.close();
  b = undefined;
});

const gw = (): Reader => serviceReader(SYS_GATEWAY);
/** The agent in the brain topic, granted the gateway scope (main token → authority agent, door 5). */
const agent = (): Reader => topicReader({ scopes: ['scope:brain', `scope:${SYS.scope}`], default_scope: `scope:${SYS.scope}`, authority: 'agent' });

const target = (kind: string, key: string, reader: Reader = gw()) =>
  b!.record({ type: SYS.types.target, label: `Цель: ${kind}`, fields: { kind, key }, scopes: [SYS.scope] }, reader);

const layer = (body: string, targets: string[], reader: Reader = gw(), extra: Record<string, unknown> = {}) =>
  b!.record(
    {
      type: SYS.types.promptLayer,
      label: 'Промпт чата',
      fields: { body, ...extra } as never,
      scopes: [SYS.scope],
      edges: targets.map((to) => ({ pred: SYS.preds.appliesTo, to })),
    },
    reader,
  );

describe('AC-R01 — the sys seed', () => {
  it('fresh boot: exactly 3 sys types, 1 predicate, the lens, the scope; a restart writes 0 acts', () => {
    b = openBrain();
    expect(b.d.sysSeedWritten).toBe(6);
    for (const t of SYS_TYPES) expect(b.d.registry.activeType(t.name)?.version).toBe(1);
    expect(b.d.registry.typeNames().filter((n) => n.startsWith('sys:')).sort()).toEqual(
      [SYS.types.lens, SYS.types.promptLayer, SYS.types.target].sort(),
    );
    expect(SYS_PREDICATES.map((p) => b!.d.registry.activePredicate(p.name)?.cardinality)).toEqual(['many']);
    // written as sys:brain through the one def path (the fold re-checks the writer — nothing rejected)
    expect(b.d.registry.rejected).toEqual([]);
    const defActs = b.acts().filter((a) => a.actor === SYS_BRAIN);
    expect(defActs).toHaveLength(6);
    const lens = decodeNode(b.d.store.readNode(PROMPT_COMPOSE_LENS_ID)!);
    expect(lens.type).toBe(SYS.types.lens);
    expect(lens.scopes).toEqual([`scope:${SYS.scope}`]);
    expect(JSON.parse(lens.fields.spec as string)).toEqual(PROMPT_COMPOSE_SPEC);
    expect(b.d.store.readNode(`scope:${SYS.scope}`)).not.toBeNull();

    const before = b.journal();
    b.restart();
    expect(b.d.sysSeedWritten).toBe(0);
    b.restart();
    expect(b.journal()).toBe(before);
  });

  it('the seeded defs carry the R-01 flags and policies', () => {
    b = openBrain();
    const pl = b.d.registry.type(SYS.types.promptLayer)!;
    expect(pl.fields.body).toMatchObject({ max_bytes: 32768, verbatim: true });
    expect(pl.approval).toBe('owner');
    expect(b.d.registry.type(SYS.types.target)!.write).toBe('owner');
    expect(b.d.registry.type(SYS.types.lens)!.write).toBe('owner');
    expect(b.d.registry.fieldPolicies()).toEqual(
      expect.arrayContaining([
        { payloadType: SYS.types.target, key: 'key', opaquePattern: '^[A-Za-z0-9_:.-]{1,64}$' },
        { payloadType: SYS.types.promptLayer, key: 'body', verbatim: true },
      ]),
    );
    // opaque + pattern does NOT widen the global (by key name) opaque list
    expect(b.d.registry.opaqueFieldNames()).not.toContain('key');
  });
});

describe('AC-R02 — body sizes and schema-author-only flags', () => {
  it('a 12 KB body is accepted; 33 KB → PAYLOAD_TOO_LARGE; other fields keep the 8 KB budget', () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    const body12 = 'Промпт темы. '.repeat(560); // ≈ 12.9 KB utf8
    expect(Buffer.byteLength(body12)).toBeGreaterThan(12 * 1024);
    const l = ok(layer(body12, [chat.id]));
    expect(b.get(l.id).fields.body).toBe(body12);

    expect(err(layer('x'.repeat(33 * 1024), [chat.id])).code).toBe('PAYLOAD_TOO_LARGE');
    // ordinary fields keep the 8 KB budget (the body is outside it)
    const nine = { a: 'q'.repeat(4000), b: 'q'.repeat(4000), c: 'q'.repeat(1000) };
    expect(err(layer('ok', [chat.id], gw(), nine)).message).toMatch(/exceed 8192 bytes/);
    expect(ok(layer('y'.repeat(30 * 1024), [chat.id], gw(), { a: 'q'.repeat(4000) })).status).toBe('active');
  });

  it('the 64 KB per-act aggregate holds even when every field has its own max_bytes', () => {
    b = openBrain();
    const def: TypeDef = {
      name: 'sys:blob-pair',
      version: 1,
      status: 'active',
      fields: { a: { kind: 'text', max_bytes: 40000 }, c: { kind: 'text', max_bytes: 40000 } },
    };
    const plan = planDefinition({ kind: 'type', def }, SYS_BRAIN, b.d.registry, { now: new Date() });
    if ('ok' in plan) throw new Error(plan.message);
    expect(b.d.engine.write(plan.act).ok).toBe(true);
    b.restart();
    const rec = (a: number, c: number) =>
      b!.record({ type: 'sys:blob-pair', label: 'Пара', fields: { a: 'a'.repeat(a), c: 'c'.repeat(c) }, scopes: [SYS.scope] }, gw());
    expect(ok(rec(30000, 30000)).status).toBe('active');
    expect(err(rec(36000, 36000)).message).toMatch(/per act/);
    // an UPDATE that grows the merged body past the cap is refused too
    const r = ok(rec(30000, 1));
    expect(
      err(b.record({ id: r.id, label: 'Пара', fields: { c: 'c'.repeat(39000) } }, gw())).message,
    ).toMatch(/per act/);
  });

  it('max_bytes / verbatim / pattern in a record body → refused; a u: def may not grant them', () => {
    b = openBrain();
    for (const k of ['max_bytes', 'verbatim', 'pattern']) {
      expect(err(b.record({ type: 'note', label: 'x', [k]: 1 } as never)).code).toBe('BAD_REQUEST');
    }
    const def: TypeDef = { name: 'u:memo', version: 1, status: 'active', fields: { text: { kind: 'text', max_bytes: 60000 } } };
    const refused = planDefinition({ kind: 'type', def }, 'user:owner', b.d.registry, { now: new Date() });
    expect('ok' in refused && refused.code).toBe('WRITE_DENIED');
    // a bypass (def act written by hand) is folded WITHOUT the flags
    const reg = new Registry();
    const sneaky = planDefinition({ kind: 'type', def: { ...def, fields: { text: { kind: 'text' } } } }, 'user:owner', reg, { now: new Date() });
    if ('ok' in sneaky) throw new Error('unexpected');
    const act = { ...sneaky.act, payload: { ...(sneaky.act.payload as object), fields: def.fields } };
    reg.foldAct(act);
    expect(reg.type('u:memo')?.fields.text).toEqual({ kind: 'text' });
  });

  it('verbatim: a body with `YYYY-MM-DD HH:MM` and a 13-digit id in its TARGET is stored byte-for-byte', () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    const body = 'Созвон 2026-10-09 14:30 (UTC+3).\n\nДедлайн 2026-10-10 09:00 — не позже.\n  отступ  ';
    const l = ok(layer(body, [chat.id]));
    expect(b.get(l.id).fields.body).toBe(body);
    // a non-verbatim text field of an ordinary type is still normalized (R-9 unchanged)
    const n = ok(b.record({ type: 'note', label: 'Заметка', fields: { text: 'в 2026-10-09 14:30' } }));
    expect(b.get(n.id).fields.text).toBe('в 2026-10-09T14:30');
  });

  it('the PII scan still runs on a verbatim body (phone, email, a bare Telegram id)', () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    expect(err(layer('звони +7 916 123-45-67', [chat.id])).code).toBe('PII_REFUSED');
    expect(err(layer('пиши a@b.co', [chat.id])).code).toBe('PII_REFUSED');
    expect(err(layer('чат -1004351636302', [chat.id])).code).toBe('PII_REFUSED');
  });
});

describe('AC-R03 — status of sys types comes from the credential (R-04 ∧ door 5)', () => {
  it('agent (main credential) without initiative → proposed; with initiative owner → WRITE_DENIED; promote → WRITE_DENIED', () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    const proposed = ok(layer('Предложение агента', [chat.id], agent()));
    expect(proposed.status).toBe('proposed');
    const denied = err(
      b.record({ type: SYS.types.promptLayer, label: 'Промпт', fields: { body: 'x' }, scopes: [SYS.scope], initiative: 'owner' }, agent()),
    );
    expect(denied.code).toBe('WRITE_DENIED');
    expect(err(b.record({ id: proposed.id, label: 'Промпт чата', initiative: 'owner' }, agent())).code).toBe('WRITE_DENIED');
    expect(b.get(proposed.id).status).toBe('proposed');
  });

  it('the gateway mandate → active, and may approve a proposal', () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    expect(ok(layer('Слой шлюза', [chat.id])).status).toBe('active');
    const p = ok(layer('Предложение', [chat.id], agent()));
    const approved = ok(b.record({ id: p.id, label: 'Промпт чата', initiative: 'owner' }, gw()));
    expect(approved.status).toBe('active');
    expect(b.acts().at(-1)?.provenance).toMatchObject({ authority: 'owner' });
  });

  it('sys:target / sys:lens are written only by an owner-authority reader (write: owner)', () => {
    b = openBrain();
    expect(err(target('chat', '-1004351636302', agent())).code).toBe('WRITE_DENIED');
    expect(
      err(b.record({ type: SYS.types.lens, label: 'Л', fields: { lens_id: 'x', version: 1, shape: 'compose', spec: '{}' }, scopes: [SYS.scope] }, agent())).code,
    ).toBe('WRITE_DENIED');
    // no reclassification into a write:owner type either
    const n = ok(b.record({ type: 'note', label: 'Заметка', scopes: [SYS.scope] }, agent()));
    expect(err(b.record({ id: n.id, type: SYS.types.target, label: 'Заметка' }, agent())).code).toBe('WRITE_DENIED');
  });
});

describe('AC-R03b — an approved layer changes only with owner authority (reviewer BLOCKER)', () => {
  const setupActive = () => {
    b = openBrain();
    const chat = ok(target('chat', '-1004351636302'));
    const topic = ok(target('topic', '-1004351636302:56'));
    const active = ok(layer('Одобренный слой', [chat.id]));
    expect(active.status).toBe('active');
    return { chat, topic, active };
  };

  it('agent update of an ACTIVE layer → WRITE_DENIED, body and rev unchanged', () => {
    const { active } = setupActive();
    expect(err(b!.record({ id: active.id, label: 'Промпт чата', fields: { body: 'EVIL' } }, agent())).code).toBe('WRITE_DENIED');
    expect(b!.get(active.id).fields.body).toBe('Одобренный слой');
    expect(b!.get(active.id).meta.rev).toBe(1);
  });

  it('agent retract of an ACTIVE layer → WRITE_DENIED, layer stays active', () => {
    const { active } = setupActive();
    expect(err(b!.record({ id: active.id, retract: true, reason: 'x' }, agent())).code).toBe('WRITE_DENIED');
    expect(b!.get(active.id).status).toBe('active');
  });

  it('agent edge change of an ACTIVE layer (record.edges and link, add or retract) → WRITE_DENIED', () => {
    const { chat, topic, active } = setupActive();
    expect(err(b!.record({ id: active.id, label: 'Промпт чата', edges: [{ pred: SYS.preds.appliesTo, to: topic.id }] }, agent())).code).toBe('WRITE_DENIED');
    expect(err(b!.link({ from: active.id, pred: SYS.preds.appliesTo, to: topic.id }, agent())).code).toBe('WRITE_DENIED');
    expect(err(b!.link({ from: active.id, pred: SYS.preds.appliesTo, to: chat.id, status: 'retracted' }, agent())).code).toBe('WRITE_DENIED');
    expect(b!.get(active.id).edges.filter((e) => e.predicate === SYS.preds.appliesTo).map((e) => e.target)).toEqual([chat.id]);
  });

  it("the agent's suggestion is a NEW proposed layer; it may edit / retract only its own proposal; the mandate may edit", () => {
    const { chat, active } = setupActive();
    const mine = ok(layer('Предложение агента', [chat.id], agent()));
    expect(mine.status).toBe('proposed');
    expect(mine.id).not.toBe(active.id);
    expect(ok(b!.record({ id: mine.id, label: 'Промпт чата', fields: { body: 'Предложение v2' } }, agent())).status).toBe('proposed');
    expect(b!.get(active.id).fields.body).toBe('Одобренный слой');
    expect(ok(b!.record({ id: mine.id, retract: true, reason: 'передумал' }, agent())).status).toBe('retracted');
    const other = topicReader({ principal: 'agent:other', scopes: [`scope:${SYS.scope}`], default_scope: `scope:${SYS.scope}`, authority: 'agent' });
    const theirs = ok(layer('Чужое предложение', [chat.id], other));
    expect(err(b!.record({ id: theirs.id, label: 'x', fields: { body: 'перехват' } }, agent())).code).toBe('WRITE_DENIED');
    expect(ok(b!.record({ id: active.id, label: 'Промпт чата', fields: { body: 'Правка шлюза' } }, gw())).status).toBe('active');
  });

  it('safety is also config: the default allowlist grants no sys-gateway scope to anyone', () => {
    const all = Object.values(defaultReaders().chats).flatMap((c) => [...(c.scopes ?? []), c.default_scope ?? '']);
    const cli = Object.values(defaultReaders().cli ?? {}).flatMap((c) => [...c.scopes, c.default_scope ?? '']);
    expect([...all, ...cli].some((s) => s.includes(SYS.scope))).toBe(false);
    // and a missing readers.json is an EMPTY allowlist (nobody, nothing)
    expect(readersLoader('/nonexistent/readers.json')()).toEqual({ owner_id: '', chats: {} });
  });
});

describe('AC-R09 — opaque Telegram keys', () => {
  it('sys:target.key = chat id / topic key passes; the same id in note.text is still refused', () => {
    b = openBrain();
    ok(target('chat', '-1004351636302'));
    ok(target('topic', '-1004351636302:56'));
    ok(target('user', '1112667160'));
    expect(err(target('chat', 'bad key with spaces')).code).toBe('BAD_REQUEST');
    expect(err(b.record({ type: 'note', label: 'Заметка', fields: { text: '-1004351636302' } })).code).toBe('PII_REFUSED');
    expect(err(b.record({ type: 'note', label: 'Заметка', fields: { key: '-1004351636302' } })).code).toBe('PII_REFUSED');
  });
});
