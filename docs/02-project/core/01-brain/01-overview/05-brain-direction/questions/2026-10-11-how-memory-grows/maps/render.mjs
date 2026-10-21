#!/usr/bin/env node
// maps/render.mjs — MINDMAP.graph.jsonl -> MINDMAP.mermaid.md (mermaid mindmap) + статистика.
// Без зависимостей. Запуск: node maps/render.mjs  (из любой папки)
// Этапы: payload.stage (считает maps/rank.mjs), условия — maps/stages.json -> maps/ROADMAP.md.
// Реальность: 🟢 code>=0.7 · 🟡 paper (code<0.7, paper>=0.5) · 🔴 gap/пусто · ★ payload.now=true.
// Слитые (status=superseded) в дерево не входят — выносятся в таблицу под диаграммой.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const src = join(dir, 'MINDMAP.graph.jsonl');
const dst = join(dir, 'MINDMAP.mermaid.md');

const nodes = readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l, i) => {
  try { return JSON.parse(l); } catch (e) { console.error(`строка ${i + 1}: битый JSON`); process.exit(1); }
});
const byId = new Map(nodes.map((n) => [n.id, n]));
const ROOT = nodes.find((n) => n.id.endsWith('/root'));
if (!ROOT) { console.error('нет корня'); process.exit(1); }

// --- статистика ---
let edges = 0;
const orphanLinks = [];
for (const n of nodes) {
  for (const l of n.links ?? []) {
    edges++;
    if (!l.to.startsWith('file:') && !byId.has(l.to)) orphanLinks.push(`${n.id} -${l.predicate}-> ${l.to}`);
  }
}
const superseded = nodes.filter((n) => n.status === 'superseded');
const live = nodes.filter((n) => n.status !== 'superseded');

// --- дерево по part-of (первый part-of; кольцо: about root) ---
const parentOf = (n) => {
  if (n.id === ROOT.id) return null;
  const p = (n.links ?? []).find((l) => l.predicate === 'part-of' && byId.has(l.to));
  if (p) return p.to;
  const a = (n.links ?? []).find((l) => l.predicate === 'about' && l.to === ROOT.id);
  return a ? ROOT.id : null;
};
const children = new Map();
const unreachable = [];
for (const n of live) {
  if (n.id === ROOT.id) continue;
  const p = parentOf(n);
  if (!p) { unreachable.push(n.id); continue; }
  if (!children.has(p)) children.set(p, []);
  children.get(p).push(n);
}
// достижимость от корня
const seen = new Set([ROOT.id]);
const stack = [ROOT.id];
while (stack.length) for (const c of children.get(stack.pop()) ?? []) { seen.add(c.id); stack.push(c.id); }
for (const n of live) if (!seen.has(n.id) && !unreachable.includes(n.id)) unreachable.push(n.id);

const icon = (n) => {
  const r = n.payload?.readiness ?? {};
  if (n.payload?.gap) return '🔴';
  if (/^ПРОТИВ/i.test(n.label)) return '⚔️';
  if ((r.code ?? 0) >= 0.7) return '🟢';
  if ((r.paper ?? 0) >= 0.5) return '🟡';
  return '🔴';
};
const clean = (s) => String(s).replace(/["\[\]\n\r]/g, "'").replace(/[(){}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);
let k = 0;
const ids = new Map();
const mid = (id) => { if (!ids.has(id)) ids.set(id, 'n' + k++); return ids.get(id); };
const lines = [];
const short = (n) => n.id.split('how-memory-grows/')[1];
const walk = (n, depth) => {
  const pad = '  '.repeat(depth);
  let text;
  if (n.id === ROOT.id) text = `❓ ${n.label}`;
  else if (n.id.endsWith('/ring')) text = `🔄 ${n.label}`;
  else { const st = n.payload?.stage; text = `${icon(n)}${n.payload?.now ? '★' : ''}${st != null ? `[Э${st}]` : ''} ${n.label}`; }
  lines.push(`${pad}${mid(n.id)}["${clean(text)}"]`);
  for (const c of children.get(n.id) ?? []) walk(c, depth + 1);
};
lines.push('mindmap');
walk(ROOT, 1);

const md = [
  '# MINDMAP — как должна расти память (вид, генерируется)',
  '',
  '- **Status:** generated · **Источник:** `maps/MINDMAP.graph.jsonl` (истина) · **Генератор:** `maps/render.mjs` — не править руками.',
  '- Легенда: 🟢 код ≥0.7 · 🟡 бумага · 🔴 пробел · ⚔️ узел-«против» · ★ «шаг СЕЙЧАС» (этап 0, payload.now) · [Эn] номер этапа (payload.stage; Э4 = заморожено, слой N+1) · 🔄 кольцо роста.',
  '',
  '```mermaid',
  ...lines,
  '```',
  '',
  '## Слитые дубли (status=superseded; в дерево не входят)',
  '',
  '| Старый узел | Заменён | Причина |',
  '|---|---|---|',
  ...superseded.map((n) => {
    const s = byId.get(n.payload?.superseded_by);
    const why = (s?.links ?? []).find((l) => l.predicate === 'supersedes' && l.to === n.id)?.note ?? '';
    return `| \`${short(n)}\` | \`${s ? short(s) : '?'}\` | ${why} |`;
  }),
  '',
].join('\n');
writeFileSync(dst, md);

// --- ROADMAP.md ---
const stagesFile = join(dir, 'stages.json');
if (existsSync(stagesFile)) {
  const { stages } = JSON.parse(readFileSync(stagesFile, 'utf8'));
  const leaf = live.filter((n) => n.payload?.score?.kind === 'leaf');
  const pay = (n) => { const p = n.payload?.pays_off; return !p ? '—' : typeof p === 'string' ? p : `${p.event}${p.date ? ` (${p.date})` : ''}`; };
  const out = ['# ROADMAP — этапы углубления (генерируется)', '',
    '- **Status:** generated · **Источник:** `maps/MINDMAP.graph.jsonl` (payload.stage/score — считает `maps/rank.mjs`) + `maps/stages.json` (условия) · **Генератор:** `maps/render.mjs` — не править руками.',
    '- Функция: балл = разблокирует × код(1|0.3) × чтение(1|0.5) × руки владельца(1|0.7|0.4); слой N+1 = 0. Этапы 2–3 считаются в мире ПОСЛЕ запуска мозга (руки=1).', ''];
  for (const st of stages) {
    const ns = leaf.filter((n) => n.payload.stage === st.n).sort((a, b) => (b.payload.score.value_post_launch - a.payload.score.value_post_launch) || (b.payload.score.value - a.payload.score.value));
    out.push(`## Этап ${st.n}${st.n === 0 ? ' ★ ШАГ СЕЙЧАС' : ''} — ${st.name}`, '', `- **Срок:** ${st.when} · **Руки:** ${st.hands}`, `- **Условие перехода:** ${st.exit}`, `- **Заморожено до этого этапа:** ${st.frozen}`, '', '| Узел | балл сейчас | балл после запуска | pays_off |', '|---|---|---|---|');
    for (const n of ns) out.push(`| \`${short(n)}\` ${n.label.replace(/\|/g, '/')} | ${n.payload.score.value} | ${n.payload.score.value_post_launch} | ${pay(n).replace(/\|/g, '/')} |`);
    out.push('');
  }
  writeFileSync(join(dir, 'ROADMAP.md'), out.join('\n'));
  console.log(`дорожная карта: ${join(dir, 'ROADMAP.md')}`);
}

console.log(`узлов: ${nodes.length} (живых ${live.length}, слитых ${superseded.length})`);
console.log(`рёбер: ${edges}`);
console.log(`сирот (links.to мимо id/file:): ${orphanLinks.length}`);
for (const o of orphanLinks) console.log('  ORPHAN', o);
console.log(`недостижимых от корня: ${unreachable.length}`);
for (const u of unreachable) console.log('  UNREACHABLE', u);
console.log(`дублей слито: ${superseded.length}`);
console.log(`пробелов-заглушек (gap): ${nodes.filter((n) => n.payload?.gap).length}`);
const cnt = { '🟢': 0, '🟡': 0, '🔴': 0, '⚔️': 0 };
for (const n of live) if (n.id !== ROOT.id && !n.id.endsWith('/ring')) cnt[icon(n)]++;
console.log(`реальность: 🟢${cnt['🟢']} 🟡${cnt['🟡']} 🔴${cnt['🔴']} ⚔️${cnt['⚔️']} · ★ ${live.filter((n) => n.payload?.now).length}`);
console.log(`вид: ${dst}`);
if (orphanLinks.length || unreachable.length) process.exit(2);
