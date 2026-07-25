#!/usr/bin/env node
// run-view.mjs — исполняет линзы (view-узлы) над реальным корпусом nodes.json.
//
// Доказывает 4 несущих механизма на ОДНИХ данных:
//   1. КОНВЕРТ         — каждый узел валиден по системному конверту (B1).
//   2. ИНВЕРСНЫЕ РЁБРА  — храним ОДНУ сторону, инверсию ВЫЧИСЛЯЕМ индексом (DEC-12).
//   3. META-СЛОЙ       — каждый тип/предикат объявлен узлом meta:, у типа есть example (DEC-13).
//   4. АГРЕГАЦИЯ VIEW  — view:cost-tree сворачивает токены по дереву делегирования (DEC-11, Q-10=subtree).
//
// Запуск:  node run-view.mjs
// Ничего не пишет на диск — только читает nodes.json и печатает результат.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(HERE, "nodes.json"), "utf8"));
const NODES = DATA.nodes;
const byId = new Map(NODES.map((n) => [n.id, n]));

const ENVELOPE_FIELDS = ["id", "type", "state", "edges", "view", "visibility", "access", "acts", "policy_ref", "body"];
const line = (s = "") => process.stdout.write(s + "\n");

// ── 1. Вычисляем ИНВЕРСНЫЙ индекс рёбер (DEC-12: одна сторона хранится, обратная — generated) ──
// reverse.get(target) -> [{ predicate, source }]
const reverse = new Map();
for (const n of NODES) {
  for (const e of n.edges || []) {
    if (!reverse.has(e.target)) reverse.set(e.target, []);
    reverse.get(e.target).push({ predicate: e.predicate, source: n.id });
  }
}
const inverseSources = (target, pred) =>
  (reverse.get(target) || []).filter((r) => r.predicate === pred).map((r) => r.source);

// ── 2. Валидация модели (пока не прошла — считать модель гипотезой) ──
function validate() {
  const problems = [];
  const declaredTypes = new Set(NODES.filter((n) => n.type === "type").map((n) => n.body?.name));
  const declaredPreds = new Set(NODES.filter((n) => n.type === "predicate").map((n) => n.body?.name));
  const typeHasExample = new Map(
    NODES.filter((n) => n.type === "type").map((n) => [n.body?.name, (n.edges || []).some((e) => e.predicate === "example")])
  );
  // Мета-слой описывает сам себя фикспойнтом meta:type/type; envelope — одноразовый descriptor конверта (DEC-13), не тип-узлов.
  const metaLayerTypes = new Set(["type", "predicate", "envelope"]);

  for (const n of NODES) {
    // 2a. конверт (B1): все системные поля на месте
    for (const f of ENVELOPE_FIELDS) if (!(f in n)) problems.push(`конверт: ${n.id} без поля '${f}'`);
    // 2b. доменные поля только в body — верхний уровень не должен нести чужого
    for (const k of Object.keys(n)) if (!ENVELOPE_FIELDS.includes(k)) problems.push(`конверт: ${n.id} лишнее верхнеуровневое поле '${k}'`);
    // 2c. рёбра: цель существует + предикат объявлен парой в meta:pred
    for (const e of n.edges || []) {
      if (!byId.has(e.target)) problems.push(`ребро: ${n.id} --${e.predicate}--> ${e.target} (цель не существует)`);
      if (!declaredPreds.has(e.predicate)) problems.push(`ребро: предикат '${e.predicate}' (у ${n.id}) не объявлен в meta:pred`);
    }
    // 2d. тип узла объявлен в meta:type (кроме фикспойнтового мета-слоя)
    if (!declaredTypes.has(n.type) && !metaLayerTypes.has(n.type))
      problems.push(`тип: '${n.type}' (у ${n.id}) не объявлен узлом meta:type`);
  }
  // 2e. у каждого доменного типа есть живой example (DEC-13)
  for (const [t, has] of typeHasExample) if (!has && !metaLayerTypes.has(t)) problems.push(`meta: тип '${t}' без ребра example (недоказанный тип)`);

  return problems;
}

// ── 3. Обобщённый исполнитель фильтра/формы (движок один — углов много) ──
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function matchFilter(node, filter, params) {
  for (const cond of filter) {
    if (cond.type && node.type !== cond.type) return false;
    if (cond.field && cond.contains) {
      let want = cond.contains;
      if (typeof want === "string" && want.startsWith("$")) want = params[want.slice(1)];
      const arr = getPath(node, cond.field);
      if (!Array.isArray(arr) || !arr.includes(want)) return false;
    }
  }
  return true;
}

// ── 4a. view:cost-tree — рекурсивный rollup по ПОДДЕРЕВУ делегирования (Q-10=subtree) ──
function ownCost(agentId, field) {
  // инверсия measures: найти snapshot-ы, которые МЕРЯЮТ этого агента, просуммировать body.tokens
  return inverseSources(agentId, "measures")
    .map((sid) => getPath(byId.get(sid), field) || 0)
    .reduce((a, b) => a + b, 0);
}
function costTree(view) {
  const b = view.body;
  const delegPred = b.traverse[0].pred; // delegates-to
  const field = b.cost_via.field;       // body.tokens
  const rows = [];
  function walk(agentId, depth) {
    const own = ownCost(agentId, field);
    const kids = (byId.get(agentId).edges || []).filter((e) => e.predicate === delegPred).map((e) => e.target);
    const childRows = kids.map((k) => walk(k, depth + 1));
    const subtree = own + childRows.reduce((s, r) => s + r.subtree, 0);
    const snap = inverseSources(agentId, "measures").map((s) => byId.get(s)).find(Boolean);
    const measurement = snap?.body?.measurement || "?";
    const row = { agentId, depth, own, subtree, measurement, children: childRows };
    rows.push(row);
    return row;
  }
  const root = walk(b.from, 0);
  return root;
}
function renderCostTree(root) {
  const fmt = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ");
  const out = [];
  function emit(row, prefix, isLast, isRoot) {
    const branch = isRoot ? "" : prefix + (isLast ? "└─ " : "├─ ");
    const tag = row.measurement === "measured" ? "measured" : row.measurement === "reconstructed" ? "RECONSTRUCTED" : row.measurement;
    if (isRoot) {
      out.push(`${row.agentId} — ПОДДЕРЕВО ${fmt(row.subtree)} ток. (self ${fmt(row.own)} ${tag})`);
    } else {
      out.push(`${branch}${row.agentId}  ${fmt(row.own)} ток. [${tag}]`);
    }
    const childPrefix = isRoot ? "" : prefix + (isLast ? "   " : "│  ");
    row.children.forEach((c, i) => emit(c, childPrefix, i === row.children.length - 1, false));
  }
  emit(root, "", true, true);
  return out.join("\n");
}

// ── 4b. view:visible-to — права видимости = ТОТ ЖЕ запрос (filter читает конверт) ──
function runVisibleTo(view) {
  const p = view.body.params;
  const seed = view.body.from.type === "*" ? NODES : NODES.filter((n) => n.type === view.body.from.type);
  return seed
    .filter((n) => matchFilter(n, view.body.filter, p))
    .map((n) => ({ id: n.id, type: n.type }));
}

// ── 4c. view:actions-by-agent — группировка через инверсию performs ──
function runActionsByAgent(view) {
  const actions = NODES.filter((n) => n.type === "action");
  const groups = new Map();
  for (const a of actions) {
    const agent = inverseSources(a.id, "performs")[0] || "(none)";
    if (!groups.has(agent)) groups.set(agent, []);
    groups.get(agent).push({ id: a.id, kind: a.body?.kind });
  }
  return groups;
}

// ── main ──
line("═".repeat(72));
line("КОРПУС: " + DATA.corpus);
line(`Узлов загружено: ${NODES.length}  (дата прогона ${DATA.date})`);
line("═".repeat(72));

line("\n[1] ВАЛИДАЦИЯ МОДЕЛИ (конверт · рёбра-пары · meta-типы/example)");
const problems = validate();
if (problems.length === 0) {
  line("    ✔ OK — все узлы в конверте, все рёбра ведут в существующие узлы,");
  line("      каждый предикат объявлен парой в meta:pred, каждый тип имеет example.");
} else {
  line(`    FAIL — ${problems.length} проблем:`);
  for (const p of problems) line("      - " + p);
}

line("\n[2] ИНВЕРСНЫЙ ИНДЕКС (DEC-12: храним одну сторону, обратную вычисляем)");
line(`    рёбер хранится: ${NODES.reduce((s, n) => s + (n.edges?.length || 0), 0)}`);
line(`    целей с входящими рёбрами (обратный индекс): ${reverse.size}`);
line(`    напр. inverse('agent:ff-personal') = ${JSON.stringify(reverse.get("agent:ff-personal"))}`);

line("\n[3] ИСПОЛНЕНИЕ view:cost-tree  (реальные токены прогона, rollup=subtree, Q-10)");
line("");
const root = costTree(byId.get("view:cost-tree"));
line(renderCostTree(root));
const childrenSum = root.children.reduce((s, r) => s + r.subtree, 0);
line("");
line(`    self (главный, reconstructed):   ${root.own.toLocaleString("ru-RU")} ток.`);
line(`    дети (делегирование, measured):  ${childrenSum.toLocaleString("ru-RU")} ток.`);
line(`    ─────────────────────────────────────────`);
line(`    ИТОГО ПОДДЕРЕВО:                 ${root.subtree.toLocaleString("ru-RU")} ток.`);

line("\n[4] ИСПОЛНЕНИЕ view:visible-to  (viewer=user:guest — права = тот же запрос)");
const vis = runVisibleTo(byId.get("view:visible-to"));
line(`    гостю (user:guest) видно узлов: ${vis.length} из ${NODES.length}`);
for (const v of vis) line(`      - ${v.id} (${v.type})`);

line("\n[5] ИСПОЛНЕНИЕ view:actions-by-agent  (группировка через инверсию performs)");
for (const [agent, acts] of runActionsByAgent(byId.get("view:actions-by-agent"))) {
  line(`    ${agent}:`);
  for (const a of acts) line(`      - ${a.id} [${a.kind}]`);
}

line("\n" + "═".repeat(72));
line(problems.length === 0
  ? "МОДЕЛЬ ДОКАЗАНА НА ДАННЫХ: линза вернула реальную сумму токенов."
  : "МОДЕЛЬ НЕ ПРОШЛА ВАЛИДАЦИЮ — см. [1]. Расширять запрещено.");
line("═".repeat(72));

process.exit(problems.length === 0 ? 0 : 1);
