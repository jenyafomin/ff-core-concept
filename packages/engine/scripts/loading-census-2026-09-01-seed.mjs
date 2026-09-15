/**
 * loading-census-2026-09-01-seed — FIRST REAL DATA. The owner's «перепись загорания» (loading census):
 * 17 real life-episodes from the week, written into the engine AS GRAPH NODES (`domain_event` acts that
 * fold into nodes, one per `provenance.source_ref`). This is EXECUTION of Путь-1 (owner-approved), not
 * design: the empty store gets its first real inhabitants.
 *
 * Discipline mirrors day-graph-seed.mjs (the prior-art writer):
 *  - append-only journal, written THROUGH `Engine.write` so provenance/hash/admission run correctly;
 *  - IDEMPOTENT two ways: kernel dedups on CONTENT hash, and we skip any act whose deterministic id is
 *    already on disk (`existingIds`), so re-running is a clean no-op and does NOT duplicate the 13 prior
 *    day-graph acts or these 17.
 *  - `principal` (ADR-0010 ② reserved form) laid at the HONEST level `whoActed:'unverified'` — an owner
 *    self-claim, NOT authenticated authority; nothing reads/enforces it. `issuer: 'loading-census'`.
 *  - edges left EMPTY: only обвязка that is explicitly stated would be wired; the owner amends later
 *    (LOSE-NOTHING). No predicate registry needed for a flat first write.
 *
 * Run (from packages/engine):
 *   node --import tsx scripts/loading-census-2026-09-01-seed.mjs
 *   node --import tsx scripts/loading-census-2026-09-01-seed.mjs --store-dir /abs/path
 *
 * Default store dir: packages/engine/.data/day-graph (the owner's existing durable store; the 13 day-graph
 * acts live there, these 17 are appended alongside → 30 total).
 */
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY } from '../src/index.js';
import { CONSTITUTION_BASE } from './day-graph-seed.mjs';

/** The census day — the natural-key namespace for these episodes. */
export const CENSUS = '2026-09-01';
/** Natural key (source_ref) an episode projects into — one graph node per slug. */
export const censusRef = (slug) => `census:${CENSUS}:${slug}`;

/**
 * The 17 episodes, VERBATIM from the owner (formulations preserved, meaning not rewritten).
 *  - slug: stable id fragment (source_ref = census:2026-09-01:<slug>).
 *  - label: short human title.
 *  - category: work | life | travel | worldview.
 *  - status: the owner's stated lifecycle word for the episode.
 *  - energy: the «загорание?» marker — 'yes' | 'pain' | 'problem' | 'tension' | null (— = no marker).
 *  - summary: the owner's words for what this episode IS.
 */
export const EPISODES = [
  { slug: 'stalling-tasks-no-observer', label: 'Задачи простаивают', category: 'work', status: 'active', energy: 'pain',
    summary: 'несколько проектов, задачи стоят — некому грамотно подсказывать/наблюдать/напоминать' },
  { slug: 'brother-agentic-onboarding', label: 'Агентская система брату', category: 'work', status: 'active', energy: 'yes',
    summary: 'внедряю агентскую систему брату под его бизнес; настраиваю его компьютер' },
  { slug: 'agentic-system-focus', label: 'Фокус на агентскую систему', category: 'work', status: 'active', energy: 'yes',
    summary: 'плотно вошёл в память+агенты, выделяю туда больше ресурса' },
  { slug: 'agentic-system-mess', label: 'Бардак в агентской системе', category: 'work', status: 'active', energy: 'problem',
    summary: 'ветки не помержены, не запущено, не протестировано, новый функционал в подготовке; стратплан есть, но не полный' },
  { slug: 'chicken-egg-memory-agents', label: 'Курица-яйцо память↔команда', category: 'work', status: 'open', energy: 'tension',
    summary: 'хорошая память требует команды агентов 24/7, а команде нужна память' },
  { slug: 'dvizh-project', label: 'Проект Движ', category: 'work', status: 'active', energy: null,
    summary: 'отдельный проект Движ, НЕ агентская система' },
  { slug: 'naming-fix-dvizh', label: 'Переименовать agents-manager', category: 'work', status: 'todo', energy: null,
    summary: 'agents-manager исторически зря зовётся Движ — подредактировать, чтобы не путать' },
  { slug: 'zhenek-site', label: 'Сайт для Женька', category: 'work', status: 'active', energy: null,
    summary: 'помочь парню Женьку сайтом (+курс)' },
  { slug: 'main-job-team-change', label: 'Смена команды на работе', category: 'work', status: 'active', energy: null,
    summary: 'несколько направлений, темп давай-давай; нужно просить повышение зарплаты' },
  { slug: 'driver-license-done', label: 'Права на машину', category: 'life', status: 'done', energy: null,
    summary: 'сделал права, долго откладывал' },
  { slug: 'life-change-discipline', label: 'Дисциплина/режим', category: 'life', status: 'intent', energy: 'yes',
    summary: 'утренние подъёмы, дисциплина, дневной режим — без этого изменений не будет' },
  { slug: 'sport-acrobatics', label: 'Акробатика/спорт', category: 'life', status: 'intent', energy: 'yes',
    summary: 'больше спорта, акробатика — боковые сальто для динамики + альтернативы' },
  { slug: 'houston-trip', label: 'Поездка в Хьюстон', category: 'travel', status: 'active', energy: null,
    summary: 'через неделю самолёт в Хьюстон, забрать украинский загранпаспорт, планировать вылет из США' },
  { slug: 'migration-route', label: 'Маршрут перемещения', category: 'travel', status: 'planning', energy: null,
    summary: '~конец окт → Кишинёв; жена→Украина, я→ОАЭ (братья); забрать сестру из Германии; далее Азия — жена хочет Бали через Таиланд, мне кажется Вьетнам (не уверен)' },
  { slug: 'water-crisis-survival', label: 'Инструкция выживания (вода)', category: 'worldview', status: 'active', energy: null,
    summary: 'чувство грядущего кризиса воды; подготовить инструкцию, чтобы спасти себя и близких, выбрать направление' },
  { slug: 'global-prep-mindset', label: 'Подготовка к катаклизмам', category: 'worldview', status: 'active', energy: null,
    summary: 'глобалисты/искусственные катаклизмы/голод/отравление рек; не воевать, а быть подготовленным, подготовить организм' },
  { slug: 'month-path-direction', label: 'Путь на месяц', category: 'travel', status: 'open', energy: null,
    summary: 'путь возможно на месяц, думать о направлении движения' },
];

/** Reserved author-attribution slot (ADR-0010 ②), honest level; nothing enforces it. */
const RESERVED_PRINCIPAL = { whoActed: 'unverified', issuer: 'loading-census' };

/** Deterministic non-crypto label for `provenance.snapshotHash` (kernel dedups on CONTENT, not this). */
function hashPayload(payload) {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

/** Build the projectable `domain_event` for one census episode (folds into node `censusRef(slug)`). */
export function toEpisodeAct(e) {
  const payload = {
    type: 'life-node', // reserved projection key → node type (does NOT become a body field).
    label: e.label,
    status: e.status,
    summary: e.summary,
    category: e.category,
    energy: e.energy,
  };
  return {
    id: `act:census:${CENSUS}:${e.slug}`,
    actor: 'owner',
    provenance: { source_ref: censusRef(e.slug), snapshotHash: hashPayload(payload) },
    recordedAt: '', // engine-assigned, immutable.
    actKind: 'domain_event',
    edges: [], // only очевидные edges would be wired; left empty, owner amends (LOSE-NOTHING).
    principal: RESERVED_PRINCIPAL,
    payload,
  };
}

/** Write the census through the Engine (fail-closed admission runs on each). Returns the acks. */
export function writeCensus(engine, existingIds = new Set()) {
  const acks = [];
  for (const e of EPISODES) {
    const act = toEpisodeAct(e);
    if (existingIds.has(act.id)) continue; // already seeded — idempotent skip
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`write refused for '${act.id}': ${ack.reason}`);
    acks.push(ack);
  }
  return acks;
}

// ── Runnable: write durably into the owner's store, then reboot a fresh store to prove it read off disk. ──
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const argIdx = process.argv.indexOf('--store-dir');
  const STORE_DIR = argIdx >= 0 ? process.argv[argIdx + 1]
    : fileURLToPath(new URL('../.data/day-graph', import.meta.url));

  const writer = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
  const engine = new Engine(writer, FIXED_POLICY);
  const existingIds = new Set(writer.acts().map((a) => a.id));
  const before = writer.acts().length;
  const acks = writeCensus(engine, existingIds);
  writer.close();

  const reboot = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
  const after = reboot.acts().length;
  const censusNodes = reboot.load().filter((n) => n.id.startsWith('census:'));
  reboot.close();

  console.log(`— written new: ${acks.length} · acts on disk: ${before} → ${after}`);
  console.log(`— census nodes projected on disk: ${censusNodes.length}/${EPISODES.length}`);
  console.log(`— durable store: ${STORE_DIR}/journal.jsonl`);
}
