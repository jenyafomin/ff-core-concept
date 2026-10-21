#!/usr/bin/env node
// maps/rank.mjs — считает payload.score / score_why / stage / now для ВСЕХ живых узлов MINDMAP.graph.jsonl.
// Функция (analyses/w2-trunk/00-TRUNK-DECISION.md): score = разблокирует × код(1|0.3) × чтение(1|0.5) × руки владельца(1|0.7|0.4);
// слой N+1 = 0. Идемпотентна. Запуск: node maps/rank.mjs && node maps/render.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const file = join(dir, 'MINDMAP.graph.jsonl');
const P = 'q:how-memory-grows/';
const nodes = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byId = new Map(nodes.map((n) => [n.id, n]));
const s = (n) => n.id.replace(P, '');

// --- руки владельца: 1 = не нужны · 0.7 = одно «да» · 0.4 = нужен вечер (запуск мозга/ручной шаг) ---
const H1 = /^(B4\/(edge-core|tree-part-of|cross-links|tags-categories|cross-project-tasks|edge-as-memory|deep-mindmap)|B5\/(copies-map|principal-collapse|trust-policy|retention-data)|B6\/(tool-journal|transcript-addr|idem-chain|voice-dup|hook-site|turn-act|manual-ledger|erase-gate|msg-address)|B7\/|B8\/|blind\/|B2\/criterion|B6\/reader-secret-filter)/;
const H07 = /^(B6\/reader-over-log|deepen\/(doors-yes|seed-r3|decision-r4-r5|blocker-decision-banned)|B5\/(floor-k4|inline-door|erase-in-brain|consent-use)|B4\/one-way-door|B2\/proto-layer)/;
const hands = (n) => (H1.test(s(n)) ? [1, 'агент сам'] : H07.test(s(n)) ? [0.7, 'одно «да»'] : [0.4, 'нужен вечер: запуск мозга/ввод в живой мозг (жизнь=0)']);
// --- даёт ЧТЕНИЕ (иначе 0.5) ---
const READ = /^(B6\/reader-over-log|B6\/reader-secret-filter|deepen\/first-read|B2\/(first-read|why-walk|smart-filters|proto-layer|waits-for-you|push-lens|resurface)|B7\/(meaning-log|lens-as-record|presets-as-lenses)|blind\/(other-reader|self-observe)|B3\/question-node)/;
// --- слой N+1 (= 0): строится над слоем, который ещё ни разу не жил ---
const NPLUS1 = /^(B8\/(?!against)|B7\/(type-views|as-of-slice|concept-render|presets-as-lenses|lens-as-record)|B4\/(deep-mindmap|people-layer|tags-categories)|B5\/(retention-data|trust-policy))/;
const FLOOR = new Set(['B6/reader-secret-filter']); // пол: обязателен до любой выдачи, не конкурирует по баллу
const kind = (n) => (/\/against$/.test(s(n)) ? 'against' : n.payload?.gap ? 'gap' : /\/branch$/.test(s(n)) || /^B[38]$/.test(s(n)) ? 'branch' : ['root', 'ring'].includes(s(n)) ? 'meta' : 'leaf');

const live = nodes.filter((n) => n.status !== 'superseded');
for (const n of live) {
  const p = (n.payload ??= {});
  const k = kind(n);
  const ul = [...new Set(p.unlocks ?? [])].filter((x) => byId.has(x) && byId.get(x).status !== 'superseded' && x !== n.id);
  const code = (p.readiness?.code ?? 0) >= 0.7 ? 1 : 0.3;
  const read = READ.test(s(n)) ? 1 : 0.5;
  const [h, hw] = hands(n);
  const np1 = NPLUS1.test(s(n));
  let score = 0, why;
  if (k === 'against' || k === 'gap' || k === 'meta') why = `${k}: не шаг, балл не считается (0)`;
  else if (np1) why = `слой N+1 = 0 (над слоем без живого прогона); ${ul.length}×${code}×${read}×${h} дало бы ${+(ul.length * code * read * h).toFixed(2)}`;
  else { score = +(ul.length * code * read * h).toFixed(2); why = `разблокирует ${ul.length} × код ${code} (code=${p.readiness?.code ?? 0}) × чтение ${read} × руки ${h} (${hw})`; }
  if (FLOOR.has(s(n))) why += ' · ПОЛ: стадия 0 по правилу, не по баллу';
  const post = np1 || ['against','gap','meta'].includes(k) ? 0 : +(ul.length * code * read).toFixed(2); // мир после запуска мозга: руки=1
  p.score = { unlocks: ul.length, code, read, hands: h, value: score, value_post_launch: post, kind: k, n_plus_1: np1 };
  p.score_why = why;
}
// --- этапы ---
const STAGE_OVERRIDE = {
  // stage 0: проба читателя + пол (фильтр секретов)
  'B6/reader-over-log': 0, 'B6/reader-secret-filter': 0,
  // stage 1: запуск и сердцебиение R1-R5 + первое чтение (дата 2026-10-18)
  'deepen/doors-yes': 1, 'deepen/backlog-r1r2': 1, 'deepen/seed-r3': 1, 'deepen/decision-r4-r5': 1, 'deepen/first-read': 1,
  'deepen/blocker-decision-banned': 1, 'B3/question-node': 1, 'B1/dictate': 1, 'B1/backlog-seed': 1, 'B6/msg-address': 1, 'B5/inline-door': 1, 'B5/floor-k4': 1,
};
const leaves = live.filter((n) => kind(n) === 'leaf');
const stageOf = new Map();
for (const n of leaves) {
  const id = s(n), sc = n.payload.score;
  let st;
  if (id in STAGE_OVERRIDE) st = STAGE_OVERRIDE[id];
  else if (sc.n_plus_1) st = 4;
  else if (sc.value_post_launch >= 1.0) st = 2;   // этапы 2-3 считаются в мире ПОСЛЕ запуска мозга (руки=1)
  else st = 3;
  stageOf.set(n.id, st);
}
// ветви: стадия = самая ранняя стадия детей; against/gap наследуют ветвь; root/ring = null
const childrenOf = (b) => live.filter((c) => (c.links ?? []).some((l) => l.predicate === 'part-of' && l.to === b.id));
for (const n of live) {
  const k = kind(n);
  if (k === 'leaf') n.payload.stage = stageOf.get(n.id);
  else if (k === 'meta') n.payload.stage = null;
}
for (const n of live) {
  const k = kind(n);
  if (k === 'branch' || k === 'against' || k === 'gap') {
    const branch = k === 'branch' ? n : (live.find((b) => kind(b) === 'branch' && (n.id.startsWith(b.id.replace('/branch', '/')) || n.id === b.id)) ?? n);
    const kids = k === 'branch' ? childrenOf(n).filter((c) => kind(c) === 'leaf') : childrenOf(branch).filter((c) => kind(c) === 'leaf');
    const st = kids.length ? Math.min(...kids.map((c) => stageOf.get(c.id))) : 3;
    n.payload.stage = st;
  }
}
for (const n of live) n.payload.now = n.payload.stage === 0 && kind(n) !== 'meta' && n.payload.stage !== null;
for (const n of nodes.filter((x) => x.status === 'superseded')) if (n.payload) n.payload.now = false;
writeFileSync(file, nodes.map((n) => JSON.stringify(n)).join('\n') + '\n');
const top = leaves.filter((n) => !n.payload.score.n_plus_1).sort((a, b) => b.payload.score.value - a.payload.score.value).slice(0, 12);
console.log('ТОП-12 (лист, не N+1):');
for (const n of top) console.log(`${n.payload.score.value}\tst${n.payload.stage}\t${s(n)}\t${n.payload.score_why}`);
const dist = {}; for (const n of leaves) dist[n.payload.stage] = (dist[n.payload.stage] ?? 0) + 1;
console.log('по этапам (листья):', JSON.stringify(dist));
