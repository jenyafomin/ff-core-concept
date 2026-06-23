/**
 * End-to-end demo of @ff/core — run with `npm run demo -w @ff/core`.
 *
 * Shows the whole substrate in one tiny flow:
 *   a direction (group) → a pre-configured chat with an agent (with context) →
 *   a raw thought captured → an agent triages it into a task and writes a trace →
 *   context cascade + level rendering + a cross-link.
 *
 * Writes into a throwaway dir under the OS temp folder and prints what it built.
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileNodeStore } from '../src/store';
import { effectiveContext } from '../src/context';
import { renderLevel } from '../src/levels';
import { recordTrace } from '../src/trace';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-demo-'));
const store = new FileNodeStore(dir);

// 1. A direction (group) carrying its CLAUDE.md-like context.
const finance = await store.create({
  kind: 'group',
  title: 'Финансы',
  tags: ['finance'],
  context: 'Направление личных финансов. Считай в рублях. Помечай перерасход.',
});

// 2. A pre-configured chat inside the direction, with an agent that has its own context.
const chat = await store.create({
  kind: 'chat',
  title: 'Разбор инбокса',
  parentId: finance.id,
  context: 'Чат, где сырые мысли превращаются в задачи и заметки.',
});
const agent = await store.create({
  kind: 'agent',
  title: 'Триаж-агент',
  parentId: chat.id,
  context: 'Будь краток. Одна мысль → одна задача или заметка. Ставь теги направлений.',
});

// 3. A raw captured thought (inbox).
const thought = await store.create({
  kind: 'thought',
  title: 'оплатить интернет до пятницы, дорого — пересмотреть тариф',
  parentId: chat.id,
  tags: ['finance'],
});

// 4. The agent triages it into a task + a note, then records a trace (graph = memory).
const task = await store.create({
  kind: 'task',
  title: 'Оплатить интернет',
  body: 'Срок: пятница. Сумма ~1500₽.',
  status: 'open',
  due: '2026-06-19',
  tags: ['finance'],
  parentId: chat.id,
  importance: 'high',
  actor: agent.id,
});
const note = await store.create({
  kind: 'note',
  title: 'Тариф интернета дорогой',
  body: 'Текущий тариф кажется завышенным. Сравнить альтернативы и посчитать экономию за год.',
  tags: ['finance'],
  parentId: chat.id,
  actor: agent.id,
});
await store.link(task.id, note.id, 'relates');

const trace = await recordTrace(store, {
  actor: agent.id,
  action: 'Разобрал мысль в задачу + заметку',
  read: [thought.id],
  wrote: [task.id, note.id],
  inChat: chat.id,
  importance: 'high',
});

// --- report -----------------------------------------------------------------
const line = '─'.repeat(60);
console.log(`\nStore: ${dir}\n${line}`);

console.log('\nГраф (kind · title):');
for (const n of await store.list()) {
  const indent = n.parentId ? '   ' : '';
  console.log(`${indent}• [${n.kind}] ${renderLevel(n, 1)}`);
}

console.log(`\n${line}\nЭффективный контекст для «${agent.title}» (каскад CLAUDE.md):`);
console.log(await effectiveContext(store, agent.id));

console.log(`\n${line}\nЗадачи в направлении Финансы (open):`);
for (const t of await store.query({ kind: 'task', status: 'open' })) {
  console.log(`• ${t.title}  (due ${t.due}, importance ${t.importance})`);
}

console.log(`\n${line}\nСлед агента (что прочитал → что создал):`);
console.log(`• ${trace.title} by ${trace.actor}`);
for (const l of trace.links) console.log(`    ${l.rel} → ${l.to}`);

console.log(`\n${line}\nLevel zoom заметки:`);
console.log('L1:', renderLevel(note, 1));
console.log('L2:', renderLevel(note, 2, 8));

await fs.rm(dir, { recursive: true, force: true });
console.log(`\n${line}\n✓ demo complete (temp store cleaned up)\n`);
