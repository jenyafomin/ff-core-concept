#!/usr/bin/env node
// run-view-depth2.mjs — исполняет линзы над ВТОРЫМ корпусом nodes-depth2.json (глубина делегирования 2).
//
// Цель — механически закрыть две честные дыры depth-1 прогона (см. README.md, «Что осталось недоказанным»):
//   ДЫРА 1 (Q-10 subtree vs direct). При глубине 1 «rollup по поддереву» и «rollup по прямым детям»
//           давали ОДНО число. Здесь есть ВНУКИ → две линзы возвращают РАЗНЫЕ суммы, дельта = сумма внуков.
//   ДЫРА 2 (Q-9 стопкран лупа). При loop_backs=0 предохранитель ни разу не срабатывал. Здесь loop-run
//           имеет loop_backs=6, iterations=7 > policy:loop-guard.max_iterations=5 → движок ловит и печатает.
//
// Сохраняет все инварианты depth-1 движка: конверт · инверсные рёбра · meta-слой с example.
// Запуск:  node run-view-depth2.mjs   (ничего не пишет на диск; exit 0 = валидация прошла и обе дыры закрыты)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(HERE, "nodes-depth2.json"), "utf8"));
const NODES = DATA.nodes;
const byId = new Map(NODES.map((n) => [n.id, n]));

const ENVELOPE_FIELDS = ["id", "type", "state", "edges", "view", "visibility", "access", "acts", "policy_ref", "body"];
const line = (s = "") => process.stdout.write(s + "\n");
const fmt = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ");

// ── 1. Инверсный индекс рёбер (DEC-12: храним одну сторону, обратную вычисляем) ──
const reverse = new Map();
for (const n of NODES) {
  for (const e of n.edges || []) {
    if (!reverse.has(e.target)) reverse.set(e.target, []);
    reverse.get(e.target).push({ predicate: e.predicate, source: n.id });
  }
}
const inverseSources = (target, pred) =>
  (reverse.get(target) || []).filter((r) => r.predicate === pred).map((r) => r.source);

// ── 2. Валидация модели (идентична depth-1 движку — новый корпус обязан оставаться зелёным) ──
function validate() {
  const problems = [];
  const declaredTypes = new Set(NODES.filter((n) => n.type === "type").map((n) => n.body?.name));
  const declaredPreds = new Set(NODES.filter((n) => n.type === "predicate").map((n) => n.body?.name));
  const typeHasExample = new Map(
    NODES.filter((n) => n.type === "type").map((n) => [n.body?.name, (n.edges || []).some((e) => e.predicate === "example")])
  );
  const metaLayerTypes = new Set(["type", "predicate", "envelope"]);

  for (const n of NODES) {
    for (const f of ENVELOPE_FIELDS) if (!(f in n)) problems.push(`конверт: ${n.id} без поля '${f}'`);
    for (const k of Object.keys(n)) if (!ENVELOPE_FIELDS.includes(k)) problems.push(`конверт: ${n.id} лишнее верхнеуровневое поле '${k}'`);
    for (const e of n.edges || []) {
      if (!byId.has(e.target)) problems.push(`ребро: ${n.id} --${e.predicate}--> ${e.target} (цель не существует)`);
      if (!declaredPreds.has(e.predicate)) problems.push(`ребро: предикат '${e.predicate}' (у ${n.id}) не объявлен в meta:pred`);
    }
    if (!declaredTypes.has(n.type) && !metaLayerTypes.has(n.type))
      problems.push(`тип: '${n.type}' (у ${n.id}) не объявлен узлом meta:type`);
  }
  for (const [t, has] of typeHasExample) if (!has && !metaLayerTypes.has(t)) problems.push(`meta: тип '${t}' без ребра example`);
  return problems;
}

// ── 3. Обобщённый rollup дерева расходов — ОДИН обход считает и subtree, и direct ──
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function ownCost(agentId, field) {
  // инверсия measures: снапшоты, которые МЕРЯЮТ этого агента → сумма body.tokens
  return inverseSources(agentId, "measures")
    .map((sid) => getPath(byId.get(sid), field) || 0)
    .reduce((a, b) => a + b, 0);
}
function costTree(view) {
  const b = view.body;
  const delegPred = b.traverse[0].pred;   // delegates-to
  const field = b.cost_via.field;         // body.tokens
  function walk(agentId, depth) {
    const own = ownCost(agentId, field);
    const kids = (byId.get(agentId).edges || []).filter((e) => e.predicate === delegPred).map((e) => e.target);
    const children = kids.map((k) => walk(k, depth + 1));
    const subtree = own + children.reduce((s, r) => s + r.subtree, 0); // self + ВСЕ потомки
    const direct = own + children.reduce((s, r) => s + r.own, 0);      // self + ТОЛЬКО прямые дети
    const snap = inverseSources(agentId, "measures").map((s) => byId.get(s)).find(Boolean);
    return { agentId, depth, own, subtree, direct, measurement: snap?.body?.measurement || "?", children };
  }
  return walk(b.from, 0);
}
// рендер с выбором scope: какое из двух чисел показываем как total узла
function renderTree(root, scope) {
  const out = [];
  const total = (r) => (scope === "subtree" ? r.subtree : r.direct);
  function emit(row, prefix, isLast, isRoot) {
    const tag = row.measurement === "measured" ? "measured" : row.measurement === "reconstructed" ? "RECONSTRUCTED" : row.measurement;
    if (isRoot) {
      const label = scope === "subtree" ? "ПОДДЕРЕВО" : "ПРЯМЫЕ";
      out.push(`${row.agentId} — ${label} ${fmt(total(row))} ток. (self ${fmt(row.own)} ${tag})`);
    } else {
      const branch = prefix + (isLast ? "└─ " : "├─ ");
      const inRollup = scope === "subtree" ? "" : row.depth > 1 ? "  (внук — ВНЕ rollup родителя)" : "";
      out.push(`${branch}${row.agentId}  self ${fmt(row.own)} ток. [${tag}]${inRollup}`);
    }
    const childPrefix = isRoot ? "" : prefix + (isLast ? "   " : "│  ");
    row.children.forEach((c, i) => emit(c, childPrefix, i === row.children.length - 1, false));
  }
  emit(root, "", true, true);
  return out.join("\n");
}
// сумма внуков (depth>=2) — то, чем subtree честно превышает direct
function grandchildSum(root) {
  let s = 0;
  (function rec(r) { if (r.depth >= 2) s += r.own; r.children.forEach(rec); })(root);
  return s;
}

// ── 4. Стопкран лупа (Q-9): loop-run с loop_backs упирается в policy:loop-guard.max_iterations ──
function loopGuard() {
  const events = [];
  for (const n of NODES.filter((x) => x.type === "loop-run")) {
    const guard = (n.policy_ref || [])
      .map((pid) => byId.get(pid))
      .find((p) => p?.body?.target === "loop");
    if (!guard) continue;
    const max = guard.body.max_iterations;
    const iters = n.body?.iterations ?? 0;
    const backs = n.body?.loop_backs ?? 0;
    if (iters > max) {
      events.push({ loop: n.id, max, iters, backs, trippedAt: max + 1, action: guard.body.on_exceed });
    }
  }
  return events;
}

// ── 5. view:visible-to и view:actions-by-agent — паритет с depth-1 движком ──
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
function runVisibleTo(view) {
  const p = view.body.params;
  const seed = view.body.from.type === "*" ? NODES : NODES.filter((n) => n.type === view.body.from.type);
  return seed.filter((n) => matchFilter(n, view.body.filter, p)).map((n) => ({ id: n.id, type: n.type }));
}
function runActionsByAgent() {
  const groups = new Map();
  for (const a of NODES.filter((n) => n.type === "action")) {
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

const root = costTree(byId.get("view:cost-tree-subtree"));

line("\n[2] ДЕРЕВО ДЕЛЕГИРОВАНИЯ (глубина 2: main → дети → внуки)");
line("    " + renderTree(root, "subtree").split("\n").join("\n    "));

line("\n[3] ДВЕ ЛИНЗЫ НА ОДНОМ КОРПУСЕ — Q-10 материален?");
line("");
line("    view:cost-tree-SUBTREE (self + ВСЕ потомки):");
line("      → " + fmt(root.subtree) + " ток.");
line("    view:cost-tree-DIRECT  (self + ТОЛЬКО прямые дети, внуки НЕ входят):");
line("      → " + fmt(root.direct) + " ток.");
const delta = root.subtree - root.direct;
const gsum = grandchildSum(root);
line(`    ─────────────────────────────────────────`);
line(`    ДЕЛЬТА (subtree − direct):        ${fmt(delta)} ток.`);
line(`    сумма внуков (depth≥2):           ${fmt(gsum)} ток.   ${delta === gsum ? "✔ дельта = внуки" : "✗ РАСХОЖДЕНИЕ"}`);
line(delta > 0
  ? "    ⇒ ДЫРА 1 ЗАКРЫТА: развилка Q-10 материальна — линзы дали РАЗНЫЕ числа."
  : "    ⇒ ДЫРА 1 НЕ закрыта: числа совпали (нет внуков?).");

line("\n[4] СТОПКРАН ЛУПА (Q-9) — сработал ли предохранитель на данных?");
const trips = loopGuard();
if (trips.length === 0) {
  line("    ⚠ ни один loop-run не превысил max_iterations — предохранитель молчит (ДЫРА 2 НЕ закрыта).");
} else {
  for (const t of trips) {
    line(`    loop-guard tripped at iteration ${t.trippedAt}`);
    line(`      loop-run: ${t.loop}  (iterations=${t.iters}, loop_backs=${t.backs}, max_iterations=${t.max})`);
    line(`      on_exceed → ${t.action}  ⇒ прогон остановлен + флаг владельцу`);
  }
  line("    ⇒ ДЫРА 2 ЗАКРЫТА: Q-9 из «заведён» → «сработал на данных».");
}

line("\n[5] view:visible-to (viewer=user:guest — права = тот же запрос)");
const vis = runVisibleTo(byId.get("view:visible-to"));
line(`    гостю (user:guest) видно узлов: ${vis.length} из ${NODES.length}`);
for (const v of vis) line(`      - ${v.id} (${v.type})`);

line("\n[6] view:actions-by-agent (группировка через инверсию performs)");
for (const [agent, acts] of runActionsByAgent()) {
  line(`    ${agent}: ${acts.map((a) => `${a.id.replace("action:", "")} [${a.kind}]`).join(" · ")}`);
}

const dyra1 = delta > 0 && delta === gsum;
const dyra2 = trips.length > 0;
line("\n" + "═".repeat(72));
if (problems.length === 0 && dyra1 && dyra2) {
  line("МЕХАНИЗМ ДОКАЗАН НА ДАННЫХ: subtree≠direct (Q-10 материален) + стопкран СРАБОТАЛ (Q-9).");
} else {
  line("ПРОВАЛ — см. секции выше. Расширять запрещено.");
}
line("═".repeat(72));

process.exit(problems.length === 0 && dyra1 && dyra2 ? 0 : 1);
