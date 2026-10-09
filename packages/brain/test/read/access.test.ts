// Isolation (R-7): readers.json allowlist, sender check, default_scope, CLI allowlist, scope gate with the
// member-of closure (≤2), PEP on readable_by. Real Engine + DurableFsStore via bootBrain (AC-01…05, 08, 10).
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { Reader, ReadersFile } from '../../src/contract.js';
import { createReadGate, createReaderResolver, find, read, resolveReader, viewerOf, type ReadDeps } from '../../src/read/index.js';
import { err, ok, openBrain, topicReader, type Brain } from '../domain/harness.js';
import {
  CLI_CWD,
  GROUP,
  OWNER_ID,
  THREAD_AGENTS,
  THREAD_BRAIN,
  cliCaller,
  defaultReaders,
  ownerInTopic,
  strangerInTopic,
  unknownChat,
} from '../support/brain-fixture.js';

let b: Brain;
afterEach(() => b?.close());

const deps = (br: Brain): ReadDeps => ({ engine: br.d.engine, store: br.d.store, clock: br.clock });
const asReader = (r: Reader | { ok: false }): Reader => {
  if ('ok' in r) throw new Error(`expected a reader, got ${JSON.stringify(r)}`);
  return r;
};

describe('resolveReader — allowlist + sender (AC-01…05)', () => {
  const readers = defaultReaders();

  it('chat not in readers.json → DEFAULT_DENY with message+hint, no body echoed (AC-01)', () => {
    const e = err(resolveReader(readers, unknownChat()) as never);
    expect(e.code).toBe('DEFAULT_DENY');
    expect(e.message).not.toBe('');
    expect(e.hint).not.toBe('');
  });

  it('allowed topic + owner sender → reader with the topic binding merged over the chat (AC-02)', () => {
    const r = asReader(resolveReader(readers, ownerInTopic(THREAD_BRAIN)));
    expect(r).toMatchObject({
      kind: 'chat',
      key: THREAD_BRAIN,
      principal: 'user:owner',
      scopes: ['scope:brain'],
      default_scope: 'scope:brain',
      write: true,
      personal: false,
      idem: true,
    });
  });

  it('allowed chat + foreign or empty sender → SENDER_DENIED (AC-03)', () => {
    expect(err(resolveReader(readers, strangerInTopic()) as never).code).toBe('SENDER_DENIED');
    expect(err(resolveReader(readers, { conversation_id: THREAD_BRAIN, message_id: '1' }) as never).code).toBe('SENDER_DENIED');
    expect(err(resolveReader(readers, { ...ownerInTopic(), sender_id: '' }) as never).code).toBe('SENDER_DENIED');
    // not-in-allowlist wins over the sender check
    expect(err(resolveReader(readers, { ...unknownChat(), sender_id: 'x' }) as never).code).toBe('DEFAULT_DENY');
  });

  it('thread without its own key falls back to the chat key (AC-04)', () => {
    const r = asReader(resolveReader(readers, ownerInTopic(`${GROUP}:777`)));
    expect(r.key).toBe(GROUP);
    expect(r.scopes).toEqual(['scope:brain', 'scope:agents', 'scope:personal']);
  });

  it('no conversation id → CLI allowlist by cwd, else DEFAULT_DENY; CLI never idem (AC-05, AC-26)', () => {
    const r = asReader(resolveReader(readers, cliCaller()));
    expect(r).toMatchObject({ kind: 'cli', key: CLI_CWD, principal: `cli:${CLI_CWD}`, scopes: ['scope:brain'], idem: false });
    expect(err(resolveReader(readers, cliCaller('/somewhere/else')) as never).code).toBe('DEFAULT_DENY');
    expect(err(resolveReader(readers, {}) as never).code).toBe('DEFAULT_DENY');
  });

  it('F-10: CLI cwd and allowlist keys are compared by realpath (symlink / macOS /tmp ≡ /private/tmp)', () => {
    const real = realpathSync(mkdtempSync(join(tmpdir(), 'ffb-cli-')));
    const link = `${real}-link`;
    symlinkSync(real, link);
    try {
      const viaLinkKey: ReadersFile = { ...readers, cli: { [link]: { principal: 'cli:x', scopes: ['scope:brain'] } } };
      expect(asReader(resolveReader(viaLinkKey, cliCaller(real)))).toMatchObject({ kind: 'cli', principal: 'cli:x' });
      const viaRealKey: ReadersFile = { ...readers, cli: { [real]: { principal: 'cli:y', scopes: ['scope:brain'] } } };
      expect(asReader(resolveReader(viaRealKey, cliCaller(link)))).toMatchObject({ kind: 'cli', principal: 'cli:y' });
      expect(err(resolveReader(viaRealKey, cliCaller(`${real}-other`)) as never).code).toBe('DEFAULT_DENY');
    } finally {
      rmSync(link);
      rmSync(real, { recursive: true });
    }
  });

  it('no message_id → idem off even in a chat', () => {
    const r = asReader(resolveReader(readers, { conversation_id: THREAD_AGENTS, sender_id: OWNER_ID }));
    expect(r.idem).toBe(false);
  });

  it('createReaderResolver re-reads the source on each call (owner edits readers.json)', () => {
    let current: ReadersFile = readers;
    const resolver = createReaderResolver(() => current);
    expect('ok' in resolver.resolve(ownerInTopic())).toBe(false);
    current = { ...readers, chats: {} };
    expect((resolver.resolve(ownerInTopic()) as { code: string }).code).toBe('DEFAULT_DENY');
  });

  it('PEP subject: personal binding reads as the owner, others as an agent', () => {
    expect(viewerOf(topicReader({ personal: true }))).toBe('user:owner');
    expect(viewerOf(topicReader({ personal: false }))).toBe('agent:user:owner');
  });
});

describe('default_scope and scope ⊆ reader on write (AC-04, AC-10)', () => {
  it('record without scopes lands in the topic default_scope; chat-only key uses the chat default', () => {
    b = openBrain();
    const readers = defaultReaders();
    readers.chats[GROUP]!.default_scope = 'scope:agents';
    const topic = asReader(resolveReader(readers, ownerInTopic(THREAD_BRAIN)));
    const chatOnly = asReader(resolveReader(readers, ownerInTopic(`${GROUP}:777`)));

    const a = ok(b.record({ type: 'task', label: 'В топике' }, topic));
    expect(b.get(a.id).scopes).toEqual(['scope:brain']);
    const c = ok(b.record({ type: 'task', label: 'В группе' }, chatOnly));
    expect(b.get(c.id).scopes).toEqual(['scope:agents']);
  });

  it('writing into a scope outside the reader → SCOPE_DENIED, nothing written; find on it → SCOPE_DENIED', () => {
    b = openBrain();
    const topic = asReader(resolveReader(defaultReaders(), ownerInTopic(THREAD_BRAIN)));
    const n = b.acts().length;
    expect(err(b.record({ type: 'task', label: 'Чужое', scopes: ['agents'] }, topic)).code).toBe('SCOPE_DENIED');
    expect(b.acts()).toHaveLength(n);
    expect(err(find(topic, { scope: 'agents' }, deps(b))).code).toBe('SCOPE_DENIED');
  });
});

describe('scope gate — member-of closure (AC-08)', () => {
  it('a task in-scope A and B (both member-of C) is found from A, from B and from C — one id', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'task', label: 'Общая задача', scopes: ['brain', 'agents'] }));
    const ids = (r: Reader) => ok(find(r, { text: 'общая' }, deps(b))).items.map((i) => i.id);
    const A = topicReader({ scopes: ['scope:brain'] });
    const B = topicReader({ scopes: ['scope:agents'] });
    const C = topicReader({ scopes: ['scope:acme'] });
    expect(ids(A)).toEqual([t.id]);
    expect(ids(B)).toEqual([t.id]);
    expect(ids(C)).toEqual([t.id]);
    expect(ok(read(C, { id: t.id }, deps(b))).node.id).toBe(t.id);
    // a reader of an unrelated scope sees nothing
    expect(ids(topicReader({ scopes: ['scope:personal'] }))).toEqual([]);
  });

  it('closure stops at 2 member-of hops', () => {
    b = openBrain({
      scopes: [
        { slug: 'holding', name: 'Холдинг', kind: 'company' },
        { slug: 'acme', name: 'Acme', kind: 'company', member_of: ['holding'] },
        { slug: 'brain', name: 'Мозг', kind: 'project', member_of: ['acme'] },
        { slug: 'sub', name: 'Под', kind: 'project', member_of: ['brain'] },
      ],
    });
    const writer = topicReader({ scopes: ['scope:sub'], default_scope: 'scope:sub' });
    const t = ok(b.record({ type: 'note', label: 'Глубоко' }, writer));
    const sees = (scope: string) => ok(find(topicReader({ scopes: [scope] }), {}, deps(b))).items.some((i) => i.id === t.id);
    expect(sees('scope:sub')).toBe(true); // 0 hops
    expect(sees('scope:brain')).toBe(true); // 1 hop
    expect(sees('scope:acme')).toBe(true); // 2 hops
    expect(sees('scope:holding')).toBe(false); // 3 hops — outside the closure
  });

  it('a reader with no scopes (or unknown scopes) sees nothing', () => {
    b = openBrain();
    ok(b.record({ type: 'task', label: 'Есть' }));
    expect(ok(find(topicReader({ scopes: [] }), {}, deps(b))).items).toEqual([]);
    expect(ok(find(topicReader({ scopes: ['scope:nowhere'] }), { preset: 'scope' }, deps(b))).items).toEqual([]);
  });
});

describe('PEP readable_by (R-7)', () => {
  it('owner-only records (person / visibility owner / personal scope) are hidden from a non-personal reader', () => {
    b = openBrain();
    const p = ok(b.record({ type: 'person', label: 'Иван — бухгалтер', fields: { name: 'Иван', role: 'бухгалтер' } }));
    const o = ok(b.record({ type: 'note', label: 'Секрет', visibility: 'owner' }));
    const s = ok(b.record({ type: 'note', label: 'Личное дело', scopes: ['personal'] }));
    const pub = ok(b.record({ type: 'note', label: 'Открытое' }));

    const owner = topicReader({ personal: true });
    const agent = topicReader({ personal: false });
    const seen = (r: Reader) => ok(find(r, {}, deps(b))).items.map((i) => i.id).sort();
    expect(seen(owner)).toEqual([p.id, o.id, s.id, pub.id].sort());
    expect(seen(agent)).toEqual([pub.id]);
    expect(err(read(agent, { id: p.id }, deps(b))).code).toBe('NOT_FOUND');
  });

  it('registry, scope and constitution nodes are never returned as records', () => {
    b = openBrain();
    const items = ok(find(topicReader(), { limit: 50 }, deps(b))).items;
    expect(items).toEqual([]);
    expect(err(read(topicReader(), { id: 'scope:brain' }, deps(b))).code).toBe('NOT_FOUND');
    expect(err(read(topicReader(), { id: 'policy:constitution' }, deps(b))).code).toBe('NOT_FOUND');
  });
});

describe('legacy tenant records are readable in-scope (AC-09 × R-7, review B3 risk)', () => {
  const legacyLine = (id: string, payload: Record<string, unknown>, readable_by?: string[]) =>
    JSON.stringify({
      id: `a_legacy${id.slice(-3)}`,
      actor: 'agent:old',
      provenance: { source_ref: id },
      recordedAt: '2026-08-01T00:00:00.000Z',
      actKind: 'domain_event',
      edges: [],
      payload: readable_by ? { ...payload, readable_by } : payload,
    });

  it('owner reader holding the tenant scope sees a legacy body.tenant record; foreign scope does not', () => {
    b = openBrain();
    b.appendRaw(legacyLine('legacy:one', { type: 'task', title: 'Старое дело', tenant: 'company:x' }));
    b.appendRaw(legacyLine('legacy:two', { type: 'note', label: 'Открытое', tenant: 'company:x' }, ['user:owner', 'agent:*']));
    b.restart();
    const gate = (over: Partial<Reader>) => createReadGate(topicReader(over), deps(b));
    const one = b.d.store.readNode('legacy:one')!;
    const two = b.d.store.readNode('legacy:two')!;

    const ownerX = gate({ scopes: ['company:x'], personal: true });
    expect(ownerX.canSee(one)).toBe(true);
    expect(ownerX.canSee(two)).toBe(true);

    // agent reader in scope: sees the record whose readable_by admits agents; no readable_by → owner-only
    const agentX = gate({ scopes: ['company:x'], personal: false });
    expect(agentX.canSee(two)).toBe(true);
    expect(agentX.canSee(one)).toBe(false);

    // outside the tenant scope → never
    expect(gate({ scopes: ['scope:brain'], personal: true }).canSee(one)).toBe(false);
    expect(gate({ scopes: ['scope:brain'], personal: false }).canSee(two)).toBe(false);
  });

  it('a non-legacy record cannot smuggle a tenant past the clamp (only legacy is normalized)', () => {
    b = openBrain();
    // a brain-shaped (meta present) record with body.tenant written straight into the journal
    b.appendRaw(JSON.stringify({
      id: 'a_forged001', actor: 'agent:x', provenance: { source_ref: 'u_forged' }, recordedAt: '2026-08-01T00:00:00.000Z',
      actKind: 'domain_event', edges: [{ predicate: 'in-scope', target: 'company:x' }],
      payload: { type: 'note', label: 'f', tenant: 'company:x', meta: { status: 'active' }, readable_by: ['user:owner', 'agent:*'] },
    }));
    b.restart();
    const node = b.d.store.readNode('u_forged')!;
    expect(createReadGate(topicReader({ scopes: ['company:x'], personal: true }), deps(b)).canSee(node)).toBe(false);
  });
});
