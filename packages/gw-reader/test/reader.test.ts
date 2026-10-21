import { afterEach, describe, expect, it } from 'vitest';
import { chatAlias, formatAddress } from '../src/address.js';
import { CARRY_MS, EXCERPT_MAX, openReadOnly, recent, resolve, topics } from '../src/reader.js';
import { REDACTED_LINE } from '../src/redact.js';
import { CHAT_A, CHAT_B, DAY, OWNER, cfg, makeFixture, type Fixture } from './support/fixture.js';

let fx: Fixture | undefined;
afterEach(() => {
  fx?.cleanup();
  fx = undefined;
});

describe('AC-1 read-only connection', () => {
  it('INSERT / UPDATE / DELETE / DDL through the reader connection all throw; file bytes unchanged', () => {
    fx = makeFixture([{ text: 'hi' }]);
    const before = fx.hash();
    const db = openReadOnly(fx.dbPath);
    try {
      expect(() => db.exec("INSERT INTO messages (id, sessionKey, botId, direction, userId, text, ts) VALUES ('x','s','b','in','u','t',1)")).toThrow();
      expect(() => db.exec("UPDATE messages SET text = 'x'")).toThrow();
      expect(() => db.exec('DELETE FROM messages')).toThrow();
      expect(() => db.exec('CREATE TABLE evil (a)')).toThrow();
      expect(() => db.exec('DROP TABLE messages')).toThrow();
      expect(() => db.exec('PRAGMA query_only = OFF; DELETE FROM messages')).toThrow();
    } finally {
      db.close();
    }
    recent(cfg(fx), { days: 30 });
    topics(cfg(fx), { days: 30 });
    expect(fx.hash()).toBe(before);
  });

  it('missing DB file is an error, never a create', () => {
    expect(() => recent({ dbPath: '/nonexistent/dir/x.db', ownerId: OWNER })).toThrow();
  });
});

describe('AC-2 secrets never reach the output', () => {
  it('redacts amqp / пароль / password / token / ghp / PEM in recent + resolve; flags redacted', () => {
    const ghp = 'ghp_' + 'Zz9'.repeat(12);
    const texts = [
      'очередь amqp://user:pass@host:5672',
      'пароль: Abc123',
      'password=hunter2',
      'token: abc123def',
      `гитхаб ${ghp}`,
      '-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA\n-----END PRIVATE KEY-----',
    ];
    fx = makeFixture(texts.map((t) => ({ text: `заметка\n${t}` })));
    const items = recent(cfg(fx), { days: 30, limit: 200 });
    expect(items).toHaveLength(texts.length);
    const dump = JSON.stringify(items);
    for (const bad of ['user:pass@', 'Abc123', 'hunter2', 'abc123def', ghp, 'MIIBVAIBADAN', 'PRIVATE KEY']) {
      expect(dump).not.toContain(bad);
    }
    expect(items.every((i) => i.redacted)).toBe(true);
    for (const i of items) {
      const r = resolve(cfg(fx), i.address);
      expect(r.ok).toBe(true);
      if (r.ok) expect(JSON.stringify(r.message)).not.toMatch(/hunter2|Abc123|user:pass@/u);
    }
  });

  it('query cannot be used as an oracle for hidden text', () => {
    fx = makeFixture([{ text: 'пароль: Abc123' }]);
    expect(recent(cfg(fx), { days: 30, query: 'Abc123' })).toHaveLength(0);
    expect(recent(cfg(fx), { days: 30, query: 'скрыта' })).toHaveLength(1);
  });
});

describe('AC-3 forwarded, foreign and outbound are excluded', () => {
  it('only owner inbound non-forwarded addressable rows pass', () => {
    fx = makeFixture([
      { text: 'моё сообщение' },
      { text: '[Пересланное сообщение от Васи]\nчужой текст' },
      { text: '  [Пересланное сообщение]\nещё чужое' },
      { text: 'цитата: [Пересланное сообщение от X] внутри' },
      { text: 'чужой пользователь', userId: '999' },
      { text: 'ответ бота', direction: 'out', mid: null },
      { text: 'ответ бота с mid', direction: 'out', userId: OWNER },
      { text: 'без message id', mid: null },
      { text: 'старое', ageMs: 40 * DAY },
    ]);
    const items = recent(cfg(fx), { days: 30, limit: 200 });
    expect(items.map((i) => i.text_excerpt)).toEqual(['моё сообщение']);
    expect(topics(cfg(fx), { days: 30 })).toEqual([
      expect.objectContaining({ thread: 56, count: 1, chat_alias: chatAlias(CHAT_A) }),
    ]);
  });
});

describe('AC-4 address is unambiguous across chats', () => {
  it('two chats with the same thread and the same message id resolve to different messages', () => {
    fx = makeFixture([
      { chat: CHAT_A, thread: 16, mid: '500', text: 'чат A' },
      { chat: CHAT_B, thread: 16, mid: '500', text: 'чат B' },
      { chat: CHAT_A, thread: null, mid: '501', text: 'без топика' },
    ]);
    const a = formatAddress(CHAT_A, 16, '500');
    const b = formatAddress(CHAT_B, 16, '500');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^gw:[0-9a-f]{6}\/t16\/m500$/u);
    expect(a).not.toContain(CHAT_A.replace('-', ''));
    const ra = resolve(cfg(fx), a);
    const rb = resolve(cfg(fx), b);
    expect(ra.ok && ra.message.text_excerpt).toBe('чат A');
    expect(rb.ok && rb.message.text_excerpt).toBe('чат B');
    const r0 = resolve(cfg(fx), formatAddress(CHAT_A, 0, '501'));
    expect(r0.ok && r0.message.text_excerpt).toBe('без топика');
    expect(resolve(cfg(fx), formatAddress(CHAT_B, 0, '501'))).toEqual({ ok: false, error: 'not_found' });
    expect(resolve(cfg(fx), 'gw:zzz/t1/m1')).toEqual({ ok: false, error: 'bad_address' });

    // topic filter by alias isolates the chat; bare t16 spans both
    expect(recent(cfg(fx), { days: 30, topic: `gw:${chatAlias(CHAT_B)}/t16` }).map((i) => i.text_excerpt)).toEqual(['чат B']);
    expect(recent(cfg(fx), { days: 30, topic: 't16' })).toHaveLength(2);
  });

  it('gateway duplicate rows of one message collapse to one address', () => {
    fx = makeFixture([
      { mid: '700', text: 'дубль' },
      { mid: '700', text: 'дубль' },
    ]);
    expect(recent(cfg(fx), { days: 30 })).toHaveLength(1);
    expect(resolve(cfg(fx), formatAddress(CHAT_A, 56, '700')).ok).toBe(true);
  });
});

describe('AC-5 excerpt bound', () => {
  it(`excerpt ≤ ${EXCERPT_MAX} chars even for long bodies`, () => {
    fx = makeFixture([{ text: 'слово '.repeat(500) }]);
    const [item] = recent(cfg(fx), { days: 30 });
    expect(item?.text_excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX);
  });

  it('limits and windows are clamped', () => {
    fx = makeFixture(Array.from({ length: 5 }, (_, i) => ({ text: `m${i}`, ageMs: (i + 1) * DAY + DAY / 2 })));
    expect(recent(cfg(fx), { days: 2 })).toHaveLength(1);
    expect(recent(cfg(fx), { days: 30, limit: 3 })).toHaveLength(3);
    expect(recent(cfg(fx), { days: 30 }).map((i) => i.text_excerpt)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
  });
});

describe('B7 carry window: a password announced in one message, value in the next', () => {
  const MIN = 60_000;
  it('hides the next owner message of the same topic within 10 min — in recent AND resolve', () => {
    fx = makeFixture([
      { mid: '800', text: 'пароль от сервера щас скину', ageMs: DAY },
      { mid: '801', text: 'Xk9mP2', ageMs: DAY - 2 * MIN },
      { mid: '802', text: 'а это уже обычное', ageMs: DAY - 3 * MIN },
      { mid: '803', text: 'чужой топик рядом', thread: 16, ageMs: DAY - MIN },
    ]);
    const items = recent(cfg(fx), { days: 30 });
    const by = new Map(items.map((i) => [i.address, i]));
    expect(by.get(formatAddress(CHAT_A, 56, '801'))?.text_excerpt).toBe(REDACTED_LINE);
    expect(by.get(formatAddress(CHAT_A, 56, '802'))?.text_excerpt).toBe('а это уже обычное');
    expect(by.get(formatAddress(CHAT_A, 16, '803'))?.text_excerpt).toBe('чужой топик рядом');
    expect(JSON.stringify(items)).not.toContain('Xk9mP2');
    const r = resolve(cfg(fx), formatAddress(CHAT_A, 56, '801'));
    expect(r.ok && r.message.text_excerpt).toBe(REDACTED_LINE);
    expect(r.ok && r.message.redacted).toBe(true);
    expect(recent(cfg(fx), { days: 30, query: 'Xk9' })).toHaveLength(0);
  });

  it('does not carry past 10 minutes', () => {
    fx = makeFixture([
      { mid: '810', text: 'пасс от роутера', ageMs: DAY },
      { mid: '811', text: 'купить молоко', ageMs: DAY - CARRY_MS - MIN },
    ]);
    const r = resolve(cfg(fx), formatAddress(CHAT_A, 56, '811'));
    expect(r.ok && r.message.text_excerpt).toBe('купить молоко');
  });

  it('the announcing message may sit just outside the days window', () => {
    fx = makeFixture([
      { mid: '820', text: 'pw ниже', ageMs: 2 * DAY + 2 * MIN },
      { mid: '821', text: 'Tr0ub4dor', ageMs: 2 * DAY - MIN },
    ]);
    const items = recent(cfg(fx), { days: 2 });
    expect(items).toHaveLength(1);
    expect(items[0]?.text_excerpt).toBe(REDACTED_LINE);
  });
});

