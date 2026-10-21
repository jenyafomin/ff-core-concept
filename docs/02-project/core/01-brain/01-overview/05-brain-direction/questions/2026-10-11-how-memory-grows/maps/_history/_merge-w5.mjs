#!/usr/bin/env node
// maps/_merge-w5.mjs — РАЗОВЫЙ слив W4/W5 в MINDMAP.graph.jsonl (идемпотентен: повтор ничего не меняет).
// 1) deepen-heartbeat (6) + blindspots (3) -> в MINDMAP; 2) чинит part-of trunk/root -> root;
// 3) real-day-replay поглощён новым узлом B6/reader-over-log (superseded, LOSE-NOTHING);
// 4) unlocks -> рёбра motivated-by (note "unlocks"); направление: unlocker -> разблокируемый.
// После слива исходные jsonl уезжают в maps/_history/ (указатель там же).
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const P = 'q:how-memory-grows/';
const rd = (f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const main = rd('MINDMAP.graph.jsonl');
const byId = new Map(main.map((n) => [n.id, n]));
const READER = P + 'B6/reader-over-log';
const hist = join(dir, '_history');

if (!byId.has(READER)) {
  const deepen = rd('deepen-heartbeat.graph.jsonl');
  const blind = rd('blindspots.graph.jsonl');
  // unlocks для deepen-узлов: в исходнике их нет — назначены W5 (см. report §Допущения)
  const DU = {
    'deepen/doors-yes': ['B1/backlog-seed', 'B3/question-node'],
    'deepen/backlog-r1r2': ['B2/first-read', 'B1/close-loop'],
    'deepen/seed-r3': ['B3/decision-derived', 'B2/first-read'],
    'deepen/decision-r4-r5': ['B2/first-read', 'B7/meaning-log'],
    'deepen/first-read': ['B7/branch', 'B8/first-system-loop'],
    'deepen/blocker-decision-banned': ['B3/decision-derived', 'B5/authority-f2'],
  };
  for (const n of deepen) {
    const s = n.id.replace(P, '');
    n.payload.unlocks = DU[s].map((x) => P + x);
    n.payload.unlocks_source = 'w5-assigned';
    n.payload.now = false;
  }
  for (const n of blind) {
    for (const l of n.links) if (l.to === P + 'trunk/root') l.to = P + 'root';
    n.payload.unlocks_source = 'w4-original';
  }
  // real-day-replay поглощён читателем
  const rdr = blind.find((n) => n.id === P + 'blind/real-day-replay');
  rdr.status = 'superseded';
  rdr.payload.superseded_by = READER;
  const unlocksMerged = [...new Set([...(rdr.payload.unlocks ?? [])])];

  const reader = {
    id: READER, type: 'note',
    label: 'Шаг 0: читатель по адресу над логом шлюза (read-only)',
    summary: 'Только чтение messages (direction=in, 14 дней, ~234 сообщения) из data/gateway-ff-personal.db; LLM-выжимка → 10 кандидатов «открытое дело/вопрос/ожидание» с адресами gw:topic56/m<id>; ноль записей в мозг; владелец одним проходом да/нет. Принятые = backlog-seed + семя-вопрос',
    status: 'proposed', temperature: 'hot', author: 'analyst/sonnet-5.5', confidence: 0.7,
    payload: {
      now: false, step: 'W5 шаг 0', who: 'агент (читает) → владелец (да/нет)', cost: 'мало',
      hands_ask: 1,
      gives_reading: true,
      unlocks: unlocksMerged.length ? [...new Set([P + 'B1/backlog-seed', P + 'B3/question-node', P + 'B2/first-read', P + 'B6/msg-address', ...unlocksMerged])]
        : [P + 'B1/backlog-seed', P + 'B3/question-node', P + 'B2/first-read', P + 'B6/msg-address'],
      unlocks_source: 'w4-converged (critic 04 §3-4 + Fable 03 G3)',
      pays_off: '2026-10-14: владелец отметил да/нет по 10 кандидатам с адресами; ≥5 из 10 «реально открыто» = читатель основной путь корма; 3–4 = гибрид с диктовкой; <3 = вернуться к диктовке B1',
      check_date: '2026-10-14',
      values: { plus: ['V1', 'V3', 'V4'], strain: ['V7'] },
      readiness: { code: 0.7, paper: 0.6, life: 0.5 },
      code_refs: ['agents-manager/data/gateway-ff-personal.db таблица messages (sessionKey, direction, text, ts, channelMessageId) — 13712 строк на 2026-10-11'],
      paper_refs: ['analyses/w4-deepen/04-critic-inversion.analysis.md §2-§4', 'analyses/w4-deepen/03-fable-blindspots.analysis.md G3, §3'],
      caveats: ['фильтр по фразам бесполезен (1452 из 2605 совпали, 56%) → нужна LLM-выжимка: токены + третьи лица (V7)', 'тестирует читателя, НЕ рост памяти: развилка «индекс над логом vs отдельное хранилище» остаётся владельцу', 'не проверено: нет ли у шлюза готового поиска//context'],
      note: 'абсорбирует blind/real-day-replay (один день → 14 дней); тестирует against B1 и B6 данными',
    },
    links: [
      { predicate: 'part-of', to: P + 'B6/branch', confidence: 1, note: 'B6a читатель (вперёд); B6b хук-писатель заморожен' },
      { predicate: 'about', to: P + 'B1/branch', confidence: 0.8, note: 'корм уже в шлюзе: владелец подтверждает, а не диктует' },
      { predicate: 'supersedes', to: P + 'blind/real-day-replay', confidence: 0.9, note: 'один день ⊂ 14 дней; те же БД, 0 записей, 0 рук' },
      { predicate: 'derived-from', to: 'file:analyses/w4-deepen/04-critic-inversion.analysis.md', confidence: 0.9, note: '§3-4 шаг 0' },
      { predicate: 'derived-from', to: 'file:analyses/w4-deepen/03-fable-blindspots.analysis.md', confidence: 0.9, note: 'G3' },
    ],
  };
  rdr.links.push({ predicate: 'superseded-by', to: READER, confidence: 0.9, note: 'поглощён шагом 0 (14 дней вместо одного)' });
  main.push(...deepen, ...blind, reader);
}

// unlocks -> motivated-by (note "unlocks")
const ids = new Set(main.map((n) => n.id));
let added = 0;
for (const n of main) {
  const u = n.payload?.unlocks;
  if (!Array.isArray(u)) continue;
  n.links ??= [];
  for (const to of u) {
    const ex = n.links.find((l) => l.predicate === 'motivated-by' && l.to === to);
    if (ex) { if (!/unlocks/.test(ex.note ?? '')) ex.note = ((ex.note ?? '') ? ex.note + ' · ' : '') + 'unlocks'; continue; }
    n.links.push({ predicate: 'motivated-by', to, confidence: 0.8, note: 'unlocks' }); added++;
  }
}
writeFileSync(join(dir, 'MINDMAP.graph.jsonl'), main.map((n) => JSON.stringify(n)).join('\n') + '\n');
console.log(`узлов: ${main.length}; добавлено unlocks-рёбер: ${added}; ссылок мимо id: ${main.flatMap((n) => (n.links ?? []).filter((l) => l.predicate === 'motivated-by' && !ids.has(l.to) && !l.to.startsWith('file:')).map((l) => n.id + '→' + l.to)).join(', ') || 0}`);

// поглощённые файлы -> _history
for (const f of ['deepen-heartbeat.graph.jsonl', 'blindspots.graph.jsonl']) {
  if (existsSync(join(dir, f))) { mkdirSync(hist, { recursive: true }); renameSync(join(dir, f), join(hist, f)); }
}
if (existsSync(hist)) writeFileSync(join(hist, 'README.md'), '# _history\n\nПоглощено в `../MINDMAP.graph.jsonl` (W5, 2026-10-11, `_merge-w5.mjs`): `deepen-heartbeat.graph.jsonl` (6 узлов), `blindspots.graph.jsonl` (3 узла; `real-day-replay` → superseded шагом `B6/reader-over-log`). Сырьё сохранено, истина — в MINDMAP.\n');
