/**
 * day-seed — the owner's REAL day-nodes for 2026-08-21 (verbatim), plus the minimal Constitution base the
 * Engine needs to start. Pure data + helpers, ZERO engine imports, so both the runnable script
 * (`scripts/day-mirror.mjs`) and the test (`test/day-mirror.test.ts`) share one source of truth.
 *
 * Each node is written as an `observation` Act, actor='owner'. `status` lives in a reserved body field
 * (`payload.status`); where a person is named, `payload.referent` carries them (Ц7 consent-FORM dogfood —
 * NOT enforced, just a field). Observations are a SIDE-JOURNAL (never project into graph nodes), so the
 * day-mirror is read back as a lens over the durable log — see src/surface/day-mirror.ts.
 */

/** ISO date of the day this snapshot captures. */
export const DAY = '2026-08-21';

/**
 * Minimal Constitution ceiling — its ONLY job is to satisfy the Engine's refuse-to-start check
 * (engine.ts CONSTITUTION_ID). Empty ceiling arrays = neutral. NOT the owner's production genesis policy.
 */
export const CONSTITUTION_BASE = [
  {
    id: 'policy:constitution',
    type: 'policy',
    state: { status: 'active' },
    edges: [],
    view: [],
    visibility: { level: 'visible-to-ai', valve: 'none', readable_by: ['agent:*', 'owner'] },
    access: { can_read: ['agent:*'], can_write: [] },
    acts: [],
    policy_ref: [],
    body: {
      synthetic: true,
      target: '*',
      authority: 'constitution',
      no_read: [],
      protected_namespaces: [],
      default: 'deny',
      note: 'minimal ceiling for the day-mirror artifact (owner-owned genesis policy lives elsewhere).',
    },
  },
];

/**
 * The owner's real day-nodes (verbatim summaries). `referent` present where a person is named.
 * status ∈ active | blocked | draft (a task = an Act + reserved status, NOT a new node type — deferred).
 */
export const OWNER_DAY_NODES = [
  {
    node: 'проект-сайт-женя',
    label: 'Проект: сайт для Жени',
    status: 'active',
    summary: 'помог Жене быстро сделать дизайн сайта, бесплатно, есть перспектива взаимодействия',
    referent: ['Женя'],
  },
  {
    node: 'rentacar',
    label: 'Rentacar',
    status: 'active',
    summary: 'сегодня много времени потрачено, впустую',
  },
  {
    node: 'движ',
    label: 'Движ',
    status: 'blocked',
    summary: 'заброшен, не работаю',
  },
  {
    node: 'память-ff',
    label: 'Память FF',
    status: 'blocked',
    summary: 'почти не взаимодействовал',
  },
  {
    node: 'документы',
    label: 'Документы',
    status: 'draft',
    summary: 'надо заниматься',
  },
  {
    node: 'спорт',
    label: 'Спорт',
    status: 'draft',
    summary: 'надо, собрать себя',
  },
  {
    node: 'график-приоритеты',
    label: 'График / приоритеты',
    status: 'draft',
    summary: 'собрать график, вести задачи чётко, расставлять приоритеты',
  },
  {
    node: 'близкие',
    label: 'Близкие',
    status: 'active',
    summary: 'уделить внимание дочке; помочь брату; помочь другу',
    referent: ['дочь', 'брат', 'друг'],
  },
  {
    node: 'эмоц-ресурс',
    label: 'Эмоциональный ресурс',
    status: 'active',
    summary: 'собраться силами эмоционально = условие для всего',
  },
];

/**
 * Build the `observation` Act envelope for one day-node. `recordedAt` is left '' — the Engine assigns it,
 * immutable (frozen act-envelope). `provenance` is a plain audit-label string (observations carry no
 * projection key / source_ref — they never fold into a graph node).
 */
export function toObservationAct(n, i) {
  const payload = { node: n.node, label: n.label, status: n.status, summary: n.summary };
  if (n.referent) payload.referent = n.referent;
  return {
    id: `act:day-mirror:${DAY}:${n.node}`,
    actor: 'owner',
    provenance: `day-mirror:${DAY}`,
    recordedAt: '',
    actKind: 'observation',
    edges: [],
    payload,
  };
}

/**
 * Write all owner day-nodes through the Engine (fail-closed admission runs on each). Returns the acks
 * ACTUALLY written. IDEMPOTENT: observation acts are NOT deduped by the store (only domain_event dedupes
 * by source_ref — see projection.ts), so re-running on a persistent store would duplicate. We skip any
 * day-node whose deterministic id (`act:day-mirror:${DAY}:${node}`) is already present → "run once per day"
 * is safe to run twice. Pass `existingIds` from `store.acts()`; empty set (default) writes all.
 */
export function writeAllDayNodes(engine, existingIds = new Set()) {
  const acks = [];
  OWNER_DAY_NODES.forEach((n, i) => {
    const act = toObservationAct(n, i);
    if (existingIds.has(act.id)) return; // already seeded today — idempotent no-op
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`write refused for '${n.node}': ${ack.reason}`);
    acks.push(ack);
  });
  return acks;
}
