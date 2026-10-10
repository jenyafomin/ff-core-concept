// SPEC-brain-r1-prompt-layers R-05: the compose lens — AND applicability (AC-R06), order = today's file join
// (AC-R07), manifest + hash + revisions (AC-R08), byte equality with dates/ids (AC-R05 brain side), latency.
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { afterEach, describe, expect, it } from 'vitest';

import type { LensResponse, Reader } from '../../src/contract.js';
import { PROMPT_COMPOSE_SPEC, SYS, SYS_GATEWAY, buildLensAct, serviceReader } from '../../src/domain/index.js';
import { lens } from '../../src/read/lens.js';
import { err, ok, openBrain, topicReader, type Brain } from '../domain/harness.js';

let b: Brain | undefined;
afterEach(() => {
  b?.close();
  b = undefined;
});

const CHAT_A = '-1004351636302';
const CHAT_B = '-1009999999999';
const gw = (): Reader => serviceReader(SYS_GATEWAY);
const deps = () => ({ engine: b!.d.engine, store: b!.d.store });
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const targets = new Map<string, string>();
function t(kind: string, key: string): string {
  const k = `${kind}|${key}`;
  if (!targets.has(k)) targets.set(k, ok(b!.record({ type: SYS.types.target, label: `Цель: ${kind}`, fields: { kind, key }, scopes: [SYS.scope] }, gw())).id);
  return targets.get(k)!;
}
function layer(body: string, tids: string[], extra: Record<string, unknown> = {}): string {
  return ok(
    b!.record(
      {
        type: SYS.types.promptLayer,
        label: 'Промпт',
        fields: { body, ...extra } as never,
        scopes: [SYS.scope],
        edges: tids.map((to) => ({ pred: SYS.preds.appliesTo, to })),
      },
      gw(),
    ),
  ).id;
}
const compose = (context: Record<string, string>, reader: Reader = gw()): LensResponse => ok(lens(reader, { lens: 'prompt-compose@1', context }, deps()));

function open(): void {
  targets.clear();
  b = openBrain();
}

describe('AC-R07 — chat + topic compose exactly like conversation-config.ts (join "\\n\\n")', () => {
  it('chat layer then topic layer; topic layer only with the topic', () => {
    open();
    const chatBody = '# Чат\nОбщие правила чата.';
    const topicBody = '# Тема 56\nМозг и память.';
    layer(topicBody, [t('bot', 'ff'), t('chat', CHAT_A), t('topic', `${CHAT_A}:56`)], { priority: 1 });
    layer(chatBody, [t('bot', 'ff'), t('chat', CHAT_A)], { priority: 0 });
    expect(compose({ bot: 'ff', chat: CHAT_A, topic: '56' }).text).toBe([chatBody, topicBody].join('\n\n'));
    expect(compose({ bot: 'ff', chat: CHAT_A }).text).toBe(chatBody);
    expect(compose({ bot: 'ff', chat: CHAT_A, topic: '65' }).text).toBe(chatBody);
  });

  it('ties: priority ↑, then created_at ↑, then id; empty bodies skipped; replace / prepend', () => {
    open();
    const chat = [t('bot', 'ff'), t('chat', CHAT_A)];
    layer('B-prio2', chat, { priority: 2 });
    layer('A-prio1-first', chat, { priority: 1 });
    layer('   \n  ', chat, { priority: 0 }); // empty → skipped, not in the manifest
    layer('C-prio1-second', chat, { priority: 1 });
    const r = compose({ bot: 'ff', chat: CHAT_A });
    expect(r.text).toBe('A-prio1-first\n\nC-prio1-second\n\nB-prio2');
    expect(r.manifest).toHaveLength(3);

    layer('PRE', chat, { priority: 3, merge: 'prepend' });
    expect(compose({ bot: 'ff', chat: CHAT_A }).text).toBe('PRE\n\nA-prio1-first\n\nC-prio1-second\n\nB-prio2');
    layer('ONLY-TOPIC', [...chat, t('topic', `${CHAT_A}:56`)], { merge: 'replace' });
    const rep = compose({ bot: 'ff', chat: CHAT_A, topic: '56' });
    expect(rep.text).toBe('ONLY-TOPIC');
    expect(rep.manifest).toHaveLength(1);
  });

  it('a target kind outside the lens order → layer skipped + LENS_KIND_OUTSIDE_ORDER (a lens revision without `user`)', () => {
    open();
    const ack = b.d.engine.write(buildLensAct(new Date(), { lens_id: 'prompt-compose', version: 2 }, { ...PROMPT_COMPOSE_SPEC, order: ['bot', 'chat', 'topic'] }));
    expect(ack.ok).toBe(true);
    layer('чат', [t('chat', CHAT_A)]);
    const userLayer = layer('пользователь', [t('chat', CHAT_A), t('user', '1112667160')]);
    const v1 = compose({ chat: CHAT_A, user: '1112667160' });
    expect(v1.text).toBe('чат\n\nпользователь');
    const v2 = ok(lens(gw(), { lens: 'prompt-compose@2', context: { chat: CHAT_A, user: '1112667160' } }, deps()));
    expect(v2.text).toBe('чат');
    expect(v2.warnings).toEqual([{ code: 'LENS_KIND_OUTSIDE_ORDER', message: expect.stringContaining(userLayer) }]);
    expect(v2.lens.id).toBe('lens:prompt-compose@2');
  });
});

describe('lens versions are data, append-only (reviewer #3)', () => {
  const lensReq = (version: number, order: string[]) => ({
    type: SYS.types.lens,
    label: 'Линза: сборка промпта',
    fields: { lens_id: 'prompt-compose', version, shape: 'compose', spec: JSON.stringify({ ...PROMPT_COMPOSE_SPEC, order }) },
    scopes: [SYS.scope],
  });

  it('the mandate writes lens:prompt-compose@2 via record (no release); @1 stays immutable; the agent cannot', () => {
    open();
    const v2 = ok(b.record(lensReq(2, ['bot', 'chat', 'topic', 'user']), gw()));
    expect(v2.id).toBe('lens:prompt-compose@2');
    expect(err(b.record(lensReq(1, ['chat']), gw())).code).toBe('CONFLICT');
    expect(err(b.record(lensReq(2, ['chat']), gw())).code).toBe('CONFLICT');
    // no way to address a lens node for update / retract (its id is not a u_ id)
    expect(err(b.record({ id: 'lens:prompt-compose@1', retract: true }, gw())).code).toBe('BAD_REQUEST');
    const agent = topicReader({ scopes: [`scope:${SYS.scope}`], default_scope: `scope:${SYS.scope}`, authority: 'agent' });
    expect(err(b.record(lensReq(3, ['chat']), agent)).code).toBe('WRITE_DENIED');

    layer('чат', [t('chat', CHAT_A)]);
    layer('проект', [t('chat', CHAT_A), t('project', 'ff')]);
    expect(compose({ chat: CHAT_A, project: 'ff' }).text).toBe('чат\n\nпроект'); // @1 knows `project` (rank = max index → tie with chat, created_at decides)
    const r2 = ok(lens(gw(), { lens: 'prompt-compose@2', context: { chat: CHAT_A, project: 'ff' } }, deps()));
    expect(r2.text).toBe('чат');
    expect(r2.warnings.map((w) => w.code)).toEqual(['LENS_KIND_OUTSIDE_ORDER']);
    expect(JSON.parse(b.get('lens:prompt-compose@1').fields.spec as string)).toEqual(PROMPT_COMPOSE_SPEC);
  });
});

describe('AC-R06 — AND applicability', () => {
  it('bot A layer never reaches bot B in the same chat; topic of chat A never matches chat B topic 56', () => {
    open();
    layer('бот A', [t('bot', 'botA'), t('chat', CHAT_A)]);
    layer('тема A:56', [t('bot', 'botA'), t('chat', CHAT_A), t('topic', `${CHAT_A}:56`)]);
    expect(compose({ bot: 'botB', chat: CHAT_A }).text).toBe('');
    expect(compose({ bot: 'botB', chat: CHAT_A, topic: '56' }).text).toBe('');
    expect(compose({ bot: 'botA', chat: CHAT_B, topic: '56' }).text).toBe('');
    expect(compose({ bot: 'botA', chat: CHAT_A }).text).toBe('бот A');
  });

  it('retracted / proposed layers and retracted targets do not apply', () => {
    open();
    const chat = t('chat', CHAT_A);
    const l = layer('живой', [chat]);
    const agent = topicReader({ scopes: [`scope:${SYS.scope}`], default_scope: `scope:${SYS.scope}`, authority: 'agent' });
    ok(b.record({ type: SYS.types.promptLayer, label: 'Предложение', fields: { body: 'предложено' }, scopes: [SYS.scope], edges: [{ pred: SYS.preds.appliesTo, to: chat }] }, agent));
    expect(compose({ chat: CHAT_A }).text).toBe('живой');
    ok(b.record({ id: l, retract: true, reason: 'устарел' }, gw()));
    expect(compose({ chat: CHAT_A }).text).toBe('');
    const l2 = layer('новый', [chat]);
    ok(b.record({ id: chat, retract: true }, gw()));
    expect(compose({ chat: CHAT_A }).manifest.map((m) => m.id)).not.toContain(l2);
  });
});

describe('AC-R08 — manifest, hash, revisions', () => {
  it('manifest = id@rev of the layers that made it; hash = sha256(text); a revision moves rev and hash, id stays', () => {
    open();
    const chat = [t('bot', 'ff'), t('chat', CHAT_A)];
    const id = ok(
      b.record(
        {
          type: SYS.types.promptLayer,
          label: 'Промпт чата',
          fields: { body: 'v1' },
          scopes: [SYS.scope],
          edges: chat.map((to) => ({ pred: SYS.preds.appliesTo, to })),
          source: { kind: 'file', ref: 'gw-prompt', hash: sha('v1') },
        },
        gw(),
      ),
    ).id;
    const r1 = compose({ bot: 'ff', chat: CHAT_A });
    expect(r1.hash).toBe(sha('v1'));
    expect(r1.manifest).toEqual([{ id, rev: 1, kinds: ['bot', 'chat'], source_hash: sha('v1') }]);
    expect(r1.lens.id).toBe('lens:prompt-compose@1');
    ok(b.record({ id, label: 'Промпт чата', fields: { body: 'v2' } }, gw()));
    const r2 = compose({ bot: 'ff', chat: CHAT_A });
    expect(r2.manifest[0]).toMatchObject({ id, rev: 2 });
    expect(r2.hash).toBe(sha('v2'));
    expect(r2.hash).not.toBe(r1.hash);
  });
});

describe('AC-R05 (brain side) — byte equality with dates and ids', () => {
  it('the composed text is byte-equal to the file join for bodies with `YYYY-MM-DD HH:MM`', () => {
    open();
    const chatBody = '# Чат\nСозвон 2026-10-09 14:30.\nДедлайн: 2026-10-12 18:00 — жёстко.';
    const topicBody = 'Тема: ревью в 2026-10-10 09:15\n\n- пункт\n- пункт';
    layer(chatBody, [t('bot', 'ff'), t('chat', CHAT_A)], { priority: 0 });
    layer(topicBody, [t('bot', 'ff'), t('chat', CHAT_A), t('topic', `${CHAT_A}:56`)], { priority: 1 });
    const r = compose({ bot: 'ff', chat: CHAT_A, topic: '56' });
    expect(Buffer.from(r.text)).toEqual(Buffer.from(`${chatBody}\n\n${topicBody}`));
  });
});

describe('lens request form', () => {
  it('bad lens name / unknown context key / missing lens', () => {
    open();
    expect(err(lens(gw(), { lens: 'prompt-compose', context: {} }, deps())).code).toBe('BAD_REQUEST');
    expect(err(lens(gw(), { lens: 'prompt-compose@1', context: { room: 'x' } as never }, deps())).code).toBe('BAD_REQUEST');
    expect(err(lens(gw(), { lens: 'prompt-compose@1', context: { topic: '56' } }, deps())).code).toBe('BAD_REQUEST');
    expect(err(lens(gw(), { lens: 'prompt-compose@2', context: {} }, deps())).code).toBe('NOT_FOUND');
    // a reader without the sys-gateway scope does not even see the lens
    expect(err(lens(topicReader(), { lens: 'prompt-compose@1', context: {} }, deps())).code).toBe('NOT_FOUND');
  });

  it('100 layers: p95 of one compose < 20 ms', () => {
    open();
    for (let i = 0; i < 50; i++) {
      const chat = `-10000000000${String(i).padStart(2, '0')}`;
      layer(`чат ${i}`, [t('bot', 'ff'), t('chat', chat)]);
      layer(`тема ${i}`, [t('bot', 'ff'), t('chat', chat), t('topic', `${chat}:7`)], { priority: 1 });
    }
    const times: number[] = [];
    for (let i = 0; i < 40; i++) {
      const t0 = performance.now();
      compose({ bot: 'ff', chat: '-1000000000007', topic: '7' });
      times.push(performance.now() - t0);
    }
    times.sort((a, z) => a - z);
    expect(compose({ bot: 'ff', chat: '-1000000000007', topic: '7' }).text).toBe('чат 7\n\nтема 7');
    expect(times[Math.ceil(0.95 * times.length) - 1]!).toBeLessThan(20);
  });
});
