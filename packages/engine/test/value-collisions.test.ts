/**
 * value-collisions — the 7 "values collide" scenarios (T1–T7) from
 *   docs/_log/2026-09-17-two-maps-and-creative-scan/DRAFT-days-and-value-tests.md §C
 * rendered as REAL, runnable tests under one reframe: **a test is a DECLARATION OF A CAPABILITY.**
 *   - a GREEN test locks a capability the engine actually HOLDS today (T3, T6, T7);
 *   - a `test.fails` is an HONEST RED: the desired capability is written as an assertion that
 *     currently FAILS — the suite stays green while the promise is unmet, and the `.fails` itself
 *     FLIPS RED the day enforcement lands (a signal to promote the capability out of "promise"); (T1, T5)
 *   - a `test.todo` is an HONEST GAP: the engine ships NO API to even express the capability yet (T2, T4).
 *
 * This file does NOT duplicate the two existing tripwires — it references and complements them:
 *   - consent-not-enforced.test.ts   (asserts today's NON-enforcement of consent.status)  → T1
 *   - edge-identity-not-enforced.test.ts (asserts edge-id is reserved-form only)           → T2
 * The tripwires assert "the engine does NOT do X (yet)"; the `.fails`/`.todo` here declare "the
 * CAPABILITY X we want" — two sides of the same honest coin.
 *
 * Minimal inline fixtures (a duplicate message, a plate typo, two contradicting facts, a revoked
 * consent) — realistic to Day-2/Day-3 of the draft, but no full day is needed.
 */
import { describe, it, test, expect } from 'vitest';
import {
  admit,
  Engine,
  MemoryStore,
  FIXED_POLICY,
  load,
  costTree,
  treeIds,
  edgeCanonicalIdOf,
  type Act,
  type ConsentAssurance,
  type EnvelopeNode,
} from '../src/index.js';

// The engine refuses to START without a policy:constitution ceiling (engine.ts fail-stop).
const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read_ids: [], protected_namespaces: [], default: 'deny' },
};

const newEngine = () => new Engine(new MemoryStore([MIN_CONSTITUTION]), FIXED_POLICY);
const nodeOf = (store: MemoryStore, id: string) => store.load().find((n) => n.id === id);

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T1 · V7×V3 — consent revoke should halt the agent (declares a capability we do NOT hold)', () => {
  // CAPABILITY: "a revoked consent on an edge STOPS an act traversing/asserting it"
  // VALUES: V7 (Согласие) × V3 (Доверие)
  // STATUS: 🔴 form-only. `consent.status` is SCHEMA-ONLY (types.ts §ConsentAssurance "SCHEMA-ONLY,
  //   NOT ENFORCED"); admit()/Engine.write() never branch on it. Tripwire that asserts today's
  //   NON-behaviour: consent-not-enforced.test.ts. This `.fails` states the WANTED behaviour instead,
  //   and will flip RED (signalling "promote me") the moment write() starts refusing a revoked edge.
  test.fails('CAPABILITY(unmet): Engine.write() REFUSES an act that asserts a `revoked`-consent edge', () => {
    const engine = newEngine();
    const revoked: ConsentAssurance = { status: 'revoked', asOf: '2026-09-17', evidenceRef: 'blob:consent-1' };
    const act: Act = {
      id: 'act:revoked-1',
      actor: 'agent:crm',
      provenance: { source_ref: 'car:А123ВС77', snapshotHash: 'h1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'referent', target: 'user:jenya', subjectRole: { consent: revoked } }],
      payload: { type: 'car' },
    };
    const ack = engine.write(act);
    // DESIRED: a revoked-consent edge is refused. TODAY: ack.ok === true → this assertion fails → `.fails` green.
    expect(ack.ok).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T2 · V2×V6 — merge two persons under one canonical_id, edges neither orphaned nor clobbered', () => {
  // CAPABILITY: "change identity (merge) WITHOUT losing the merged unit's edges"
  // VALUES: V2 (Тождество) × V6 (Реляционность)
  // STATUS: 🟡 not built. `edgeCanonicalIdOf` DERIVES a through-line id (pure form), but there is NO
  //   merge/split/retarget op and NO edge-inheritance — deferred (ADR-0015 §Reserved-Form; §D of the
  //   draft). The tripwire edge-identity-not-enforced.test.ts proves nothing materializes/enforces it.
  //   No API exists to express the merge, so this is an honest TODO, not a fake red.
  test.todo(
    'CAPABILITY(no API): merge person:Артём-day2 into person:Артём-known keeps BOTH edge-sets under one canonical_id ' +
      '— blocked: no merge/split/retarget op (ADR-0015 Reserved-Form); see edge-identity-not-enforced.test.ts',
  );

  // Sanity that the FORM T2 would build on exists (pure derivation only — proves it is form, not behaviour):
  it('(form check) edgeCanonicalIdOf falls back to the derived id when no canonical_id is set (no merge history)', () => {
    const canon = edgeCanonicalIdOf('person:Артём-known', { predicate: 'same-as', target: 'person:Артём-day2' });
    expect(canon).toMatch(/^edge:sha256:v1:[0-9a-f]+$/); // a derived fingerprint, NOT a journaled through-line
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T3 · V2×V3 — two sources contradict → freshest wins, the old act stays in the log (audit)', () => {
  // CAPABILITY: "a conflict converges to the freshest fact, auditably (log keeps the superseded one)"
  // VALUES: V2 (Тождество) × V3 (Доверие)
  // STATUS: 🟢 held. CQRS supersession (ADR-0008, projection.ts freshest-wins). Home of the mechanism:
  //   projection.test.ts; here it is exercised on the Day-3 "без царапин vs царапина" conflict.
  it('partner says "no scratch", mechanic later says "scratch" → node reflects mechanic; BOTH acts retained', () => {
    const store = new MemoryStore([MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY);
    const ref = 'car:А123ВС77:condition';
    const partner: Act = {
      id: 'act:cond-partner',
      actor: 'sync:partner',
      provenance: { source_ref: ref, snapshotHash: 'h-partner' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payload: { type: 'fact', scratch: false, asserted_by: 'partner' },
    };
    const mechanic: Act = {
      id: 'act:cond-mechanic',
      actor: 'sync:mechanic',
      provenance: { source_ref: ref, snapshotHash: 'h-mechanic' }, // changed hash ⇒ superseding event
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payload: { type: 'fact', scratch: true, asserted_by: 'mechanic' },
    };
    expect(engine.write(partner).ok).toBe(true);
    expect(engine.write(mechanic).ok).toBe(true);

    const node = nodeOf(store, ref);
    expect(node?.body).toEqual({ scratch: true, asserted_by: 'mechanic' }); // freshest wins, NOT a merge/last-writer-blob
    expect(node?.state?.version).toBe(2); // depth of the act chain
    expect(store.acts()).toHaveLength(2); // append-only: the superseded "no scratch" act is NOT erased (auditable)
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T4 · V4×V1 — a cold unit does not surface in a hot view but still yields its label cheaply', () => {
  // CAPABILITY: "forgetting is cheap-readable, not loud" (a cooled unit drops out of hot views yet a
  //   label/summary stays a cheap glance)
  // VALUES: V4 (Витальность) × V1 (Читаемость)
  // STATUS: 🟡 not built. There are NO salience/temperature/confidence fields on the node and no
  //   hot/cold view axis (draft §D). Nothing to assert without inventing an API → honest TODO.
  test.todo(
    'CAPABILITY(no API): a `cold` unit is absent from the hot view yet returns its `label` at glance-cost ' +
      '— blocked: no salience/temperature field on the node, no hot/cold view (draft §D)',
  );
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T5 · V7×V5 — a unit should carry its own access-policy across engines (portability)', () => {
  // CAPABILITY: "a unit carries its rules with it — a DIFFERENT engine enforces the same access"
  // VALUES: V7 (Согласие) × V5 (Суверенность)
  // STATUS: 🔴 form-only. The `policy_ref` FORM round-trips (it is just JSON), but resolve() NEVER
  //   consults `policy_ref`; access comes from grants/visibility in THIS graph. There is no export
  //   round-trip / `engine_contract_version` handshake (draft §D). So a node moved to a fresh engine
  //   carrying ONLY its own `policy_ref` does NOT reproduce its access — the capability is unmet.
  //   (NOTE — a real map-vs-reality discrepancy: draft §C tables T5 as 🔴 FAIL, draft §D lists the same
  //    portability gap as 🟡. Reality here = a genuine unmet capability with a resolve() path to point at,
  //    so we render it `.fails` (red), matching §C, and flag the §C/§D inconsistency in the return.)
  test.fails('CAPABILITY(unmet): a portable unit re-enforces its own policy in a second engine', () => {
    // A node declares it is governed by a portable rule (via policy_ref) that WOULD grant its owner read.
    const portable: EnvelopeNode = {
      id: 'unit:portable-1',
      type: 'record',
      state: {},
      edges: [],
      view: [],
      visibility: {}, // deliberately no inline readable_by — the ONLY thing carried is policy_ref
      access: {},
      acts: [],
      policy_ref: ['policy:only-owner-may-read'], // "my rules travel with me"
      body: { owner: 'user:owner' },
    };
    // Engine B receives ONLY the unit (its policy_ref) — NOT the FF grant graph.
    const graphB = load([portable]);
    // DESIRED: the carried policy_ref still lets the owner read. TODAY: resolve() ignores policy_ref →
    // default-deny → this assertion fails → `.fails` green. Flips RED when portability lands.
    expect(FIXED_POLICY.resolve('read', 'user:owner', portable, graphB)).toBe('allow');
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T6 · V7×V3 — PII ingest is refused unless carried by-reference (safe by construction)', () => {
  // CAPABILITY: "PII cannot enter the append-only journal inline — only by ref+hash"
  // VALUES: V7 (Согласие) × V3 (Доверие)
  // STATUS: 🟢 held. admit() no-inline-PII gate (ADR-0007). Home of the mechanism: the admission gate;
  //   here exercised on a Day-2 customer record (name+phone).
  it('an inline customer phone is REFUSED; the same record carried by-ref is admitted', () => {
    const engine = newEngine();
    const inlinePII: Act = {
      id: 'act:cust-inline',
      actor: 'sync:rentacar',
      provenance: { source_ref: 'sheets:Customers#7', snapshotHash: 'h1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payload: { type: 'person', name: 'Артём', phone: '+79161234567' }, // inline PII → must be refused
    };
    const ack = engine.write(inlinePII);
    expect(ack.ok).toBe(false); // fail-closed BEFORE any journal write
    if (!ack.ok) expect(ack.reason).toMatch(/inline PII/i);

    // The by-ref form of the SAME record passes the gate (PII lives behind payloadRef+payloadHash).
    const byRef: Act = {
      id: 'act:cust-byref',
      actor: 'sync:rentacar',
      provenance: { source_ref: 'sheets:Customers#7', snapshotHash: 'h1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payloadRef: 'blob:customer-7',
      payloadHash: 'sha256:deadbeef',
      payload: { type: 'person' }, // non-PII fields may stay inline
    };
    expect(admit(byRef).ok).toBe(true); // the gate itself passes the by-ref form
    expect(engine.write(byRef).ok).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('T7 · V1×V3 — a cost aggregate does NOT leak a node the viewer may not read', () => {
  // CAPABILITY: "aggregates never reveal what you cannot read — a hidden branch is PRUNED, not zeroed"
  // VALUES: V1 (Читаемость) × V3 (Доверие)
  // STATUS: 🟢 held (FIXED). This is the same Hole B fix proven at scale in capability.test.ts against
  //   the real corpus; here a MINIMAL inline graph makes the value-collision self-contained. The auditor
  //   may read `agent:open` (and its measuring snapshot) but NOT `agent:secret` (nor its snapshot).
  it('costTree prunes the unreadable branch entirely: its id is absent AND its numeric cost never rolls up', () => {
    const graph = load([
      MIN_CONSTITUTION,
      {
        id: 'agent:root',
        type: 'agent',
        edges: [
          { predicate: 'delegates-to', target: 'agent:open' },
          { predicate: 'delegates-to', target: 'agent:secret' },
        ],
        visibility: { readable_by: ['agent:auditor'] },
      },
      // readable branch — the auditor MAY see it and its cost.
      { id: 'agent:open', type: 'agent', edges: [], visibility: { readable_by: ['agent:auditor'] } },
      {
        id: 'snap:open',
        type: 'snapshot',
        edges: [{ predicate: 'measures', target: 'agent:open' }],
        visibility: { readable_by: ['agent:auditor'] },
        body: { tokens: 10 },
      },
      // secret branch — auditor may NOT read the agent NOR its measuring snapshot.
      { id: 'agent:secret', type: 'agent', edges: [], visibility: {} },
      {
        id: 'snap:secret',
        type: 'snapshot',
        edges: [{ predicate: 'measures', target: 'agent:secret' }],
        visibility: {}, // default-deny → unreadable → 99999 must NOT surface
        body: { tokens: 99999 },
      },
    ]);

    const tree = costTree(graph, 'agent:root', { viewer: 'agent:auditor', policy: FIXED_POLICY });

    // (1) STRUCTURE: the secret id is not in the tree; the readable one is (pruned, not zeroed).
    expect(treeIds(tree)).toContain('agent:open');
    expect(treeIds(tree)).not.toContain('agent:secret');
    // (2) NUMBER: the leaked 99999 never enters the rollup; only the 10 the auditor may read does.
    expect(tree.subtree).toBe(10);
    // (3) even asked directly, the secret's own cost is 0 for this viewer (its snapshot is unreadable).
    expect(costTree(graph, 'agent:secret', { viewer: 'agent:auditor', policy: FIXED_POLICY }).own).toBe(0);
  });
});
