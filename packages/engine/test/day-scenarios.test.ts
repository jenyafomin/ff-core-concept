/**
 * day-scenarios — the "data-as-capability" corpus at the level of DAYS and AGGREGATES.
 *
 * Owner's reframe (2026-09-17, `.claude/rules/recursive-orchestration-method.md` companion draft
 *   docs/_log/2026-09-17-two-maps-and-creative-scan/DRAFT-days-and-value-tests.md):
 *   **тест = декларация возможности**, movement «одни единицы → совокупность разных единиц → гоняем
 *   данные как в сложной системе». This file walks that ladder on REAL day fixtures:
 *
 *   1. a SINGLE unit            → V1 Читаемость (thin passport)
 *   2. a PAIR of linked units   → V6 Реляционность × V1 (edge lands on a real node)
 *   3. the NOISY day            → V2 Тождество (dedup + partial passport) · V7 Согласие (PII gate)
 *   4. the CONFLICT cluster     → V3×V2 (freshest-wins) held; V7/V2/V4 unbuilt = honest reds
 *   5. the WHOLE aggregate      → many unit-types at once: referential integrity + isolation
 *
 * Capabilities the engine HOLDS are green; capabilities it does NOT are `test.fails` (form present,
 * behaviour unmet — flips red when enforcement lands) or `test.todo` (no API to even express it). This
 * complements value-collisions.test.ts (T1–T7 on minimal inline fixtures) with GROWING aggregates on
 * realistic day data.
 */
import { describe, it, test, expect } from 'vitest';
import {
  runDay,
  aggregate,
  newDayEngine,
  nodeOf,
  domainEvent,
  assertThinPassport,
  assertFreshestWins,
  assertDedup,
  assertPiiRefused,
  assertAdmitted,
  assertNoOrphanEdges,
  assertRevokedEdgeRefused,
  orphanEdges,
} from './support/day-scenario.js';
import { day1Simple } from './fixtures/days/day1-simple.js';
import { day2Noisy, day2DupMessage, day2CustomerInlinePii, day2CustomerByRef } from './fixtures/days/day2-noisy.js';
import { day3Conflict, day3Condition, day3RevokedConsentAct } from './fixtures/days/day3-conflict.js';

// ── Rung 1 · a SINGLE unit — V1 Читаемость ──────────────────────────────────────────────────────────
describe('rung 1 · single unit — the passport yields its grain cheaply (V1)', () => {
  it('a lone message projects to a thin passport whose summary reads without cracking the body', () => {
    const { store, acks } = runDay({
      id: 'one-message',
      title: 'одна единица',
      acts: [domainEvent({ ref: 'msg:solo', type: 'message', body: { summary: 'позвонить брату', channel: 'tg' } })],
    });
    expect(acks.every((a) => a.ok)).toBe(true);
    const node = nodeOf(store, 'msg:solo');
    expect(node?.type).toBe('message'); // the grain (type) is on the envelope, no body crack
    assertThinPassport(node, { grain: 'summary', maxFields: 4 });
    expect(node?.state?.version).toBe(1);
  });
});

// ── Rung 2 · a PAIR of linked units — V6 × V1 ───────────────────────────────────────────────────────
describe('rung 2 · a pair of linked units — the edge lands on a real node (V6×V1)', () => {
  it('day-1 task --belongs-to--> project: both project as nodes, the edge is not orphaned', () => {
    const { store, acks } = runDay(day1Simple);
    expect(acks.every((a) => a.ok)).toBe(true);

    const task = nodeOf(store, 'task:pay-hosting');
    const project = nodeOf(store, 'project:infra');
    expect(task).toBeDefined();
    expect(project).toBeDefined();

    // the edge exists and its target resolves (Ц6 referential integrity on a pair).
    const belongsTo = (task?.edges ?? []).filter((e) => e.predicate === 'belongs-to');
    expect(belongsTo.map((e) => e.target)).toEqual(['project:infra']);
    assertThinPassport(task, { grain: 'summary' });
    assertNoOrphanEdges(store.load());
  });

  it('belongs-to is a one-relation: re-pointing the task REPLACES the edge (no stale duplicate)', () => {
    const { engine, store } = newDayEngine({ 'belongs-to': 'one' });
    engine.write(domainEvent({ ref: 'project:a', type: 'project', body: { label: 'A' } }));
    engine.write(domainEvent({ ref: 'project:b', type: 'project', body: { label: 'B' } }));
    engine.write(
      domainEvent({ ref: 'task:t', type: 'task', body: { summary: 't' }, edges: [{ predicate: 'belongs-to', target: 'project:a' }] }),
    );
    // re-home the task to project:b (a superseding event) — `one` REPLACES, does not accumulate.
    engine.write(
      domainEvent({ ref: 'task:t', type: 'task', snapshotHash: 'h2', edges: [{ predicate: 'belongs-to', target: 'project:b' }] }),
    );
    const task = nodeOf(store, 'task:t');
    const targets = (task?.edges ?? []).filter((e) => e.predicate === 'belongs-to').map((e) => e.target);
    expect(targets).toEqual(['project:b']); // exactly one, the freshest
  });
});

// ── Rung 3 · the NOISY day — V2 Тождество · V7 Согласие ──────────────────────────────────────────────
describe('rung 3 · the noisy day — identity under dupes/typos/partials (V2: dedup✓, typo-merge✗ todo), PII refused (V7)', () => {
  it('writes the whole noisy day; a partial person passport does not crash the write', () => {
    const { store, acks } = runDay(day2Noisy);
    expect(acks.every((a) => a.ok)).toBe(true);
    const artem = nodeOf(store, 'person:artem-day2');
    expect(artem?.body).toEqual({ label: 'Артём' }); // incomplete but valid
  });

  it('idempotent dedup: a byte-identical re-sent message is a no-op (log does not grow)', () => {
    const { engine, store } = runDay(day2Noisy);
    const before = store.acts().length;
    const ack = engine.write(day2DupMessage); // network re-delivery of msg:rent-1
    assertDedup(ack);
    expect(store.acts().length).toBe(before); // append-only log did NOT grow
  });

  it('V7 — an inline customer phone is refused; the same record by-ref is admitted', () => {
    const { engine } = runDay(day2Noisy);
    assertPiiRefused(engine, day2CustomerInlinePii); // fail-closed BEFORE any journal write
    assertAdmitted(engine, day2CustomerByRef); // PII behind payloadRef+payloadHash passes the gate
  });

  it('HONEST GAP — the plate typo is NOT merged: two car nodes coexist, same-as is form only (V2×V6)', () => {
    const { store } = runDay(day2Noisy);
    // Both writings survive as SEPARATE nodes — there is no merge op to collapse them under one id.
    expect(nodeOf(store, 'car:А123ВС77')).toBeDefined();
    expect(nodeOf(store, 'car:А123ВС7')).toBeDefined();
    // the `same-as` edge is asserted (form) but stamps NO canonical_id / inherits NO edges (ADR-0015 Reserved).
    const canon = nodeOf(store, 'car:А123ВС77');
    const sameAs = (canon?.edges ?? []).filter((e) => e.predicate === 'same-as');
    expect(sameAs.map((e) => e.target)).toEqual(['car:А123ВС7']);
    expect(sameAs[0]).not.toHaveProperty('canonical_id'); // not materialized
  });

  test.todo(
    'CAPABILITY(no API): merge car:А123ВС7 (typo) INTO car:А123ВС77 keeps both edge-sets under one canonical_id ' +
      '— blocked: no merge/split/retarget op (ADR-0015 Reserved-Form); see edge-identity-not-enforced.test.ts',
  );
});

// ── Rung 4 · the CONFLICT cluster — 4 values interact ────────────────────────────────────────────────
describe('rung 4 · the conflict cluster — freshest-wins held (V3×V2); consent/merge/cold unbuilt', () => {
  it('V3×V2 — partner "no scratch" then mechanic "scratch": node reflects mechanic, BOTH acts retained', () => {
    const { store, acks } = runDay(day3Conflict);
    expect(acks.every((a) => a.ok)).toBe(true);
    assertFreshestWins(store, day3Condition.ref, {
      body: day3Condition.body,
      version: day3Condition.version,
      retainedActs: day3Condition.retainedActs,
    });
  });

  // V7×V3 — the consent revoke SHOULD halt the agent. It does NOT today (schema-only). `.fails` stays
  // green while unmet and FLIPS RED the day write() starts refusing a revoked edge (promote-me signal).
  test.fails('CAPABILITY(unmet): write() REFUSES an act asserting a `revoked`-consent edge (V7×V3)', () => {
    const { engine } = runDay(day3Conflict);
    assertRevokedEdgeRefused(engine, day3RevokedConsentAct);
  });

  // V2×V6 — "Артём" from day-2 is the same person as a long-known contact: an identity merge. No op exists.
  test.todo(
    'CAPABILITY(no API): merge person:artem-day2 into a known contact under one canonical_id, edges neither ' +
      'orphaned nor clobbered — blocked: no merge/split/retarget (ADR-0015 Reserved-Form)',
  );

  // V4×V1 — the 3-week-old "в сервисе" fact should COOL and drop out of a hot view, still yielding its
  // label cheaply. No salience/temperature field exists on the node → no API to express it (draft §D).
  test.todo(
    'CAPABILITY(no API): a stale fact cools to `cold`, absent from the hot view yet returns its label at ' +
      'glance-cost — blocked: no salience/temperature/confidence field on the node (draft §D)',
  );
});

// ── Rung 5 · the WHOLE aggregate — many unit-types at once ───────────────────────────────────────────
describe('rung 5 · the whole aggregate — heterogeneous units run together as a complex system', () => {
  const corpus = aggregate('all-three-days', 'три дня вместе', day1Simple, day2Noisy, day3Conflict);

  it('writes all three days into ONE engine; every act is accepted', () => {
    const { acks } = runDay(corpus);
    expect(acks.every((a) => a.ok)).toBe(true);
  });

  it('the aggregate mixes real unit-types (message·task·meeting·person·project·car·fact)', () => {
    const { store } = runDay(corpus);
    const types = new Set(store.load().map((n) => n.type));
    for (const t of ['message', 'task', 'meeting', 'person', 'project', 'car', 'fact']) {
      expect(types.has(t), `aggregate should contain a '${t}' unit`).toBe(true);
    }
  });

  it('V6 — referential integrity holds across the heterogeneous aggregate (no orphan edges)', () => {
    const { store } = runDay(corpus);
    assertNoOrphanEdges(store.load());
  });

  it('isolation — the conflict cluster converges without disturbing the clean day-1 units (V2×V3)', () => {
    const { store } = runDay(corpus);
    // the conflict node still reflects the freshest fact…
    assertFreshestWins(store, day3Condition.ref, {
      body: day3Condition.body,
      version: day3Condition.version,
      retainedActs: day3Condition.retainedActs,
    });
    // …while a clean day-1 unit is untouched: still open, still version 1 (no cross-unit bleed).
    const task = nodeOf(store, 'task:pay-hosting');
    expect(task?.body).toEqual({ summary: 'оплатить хостинг', status: 'open' });
    expect(task?.state?.version).toBe(1);
  });

  // HONEST TRIPWIRE — orphan-protection is a DATA discipline, NOT an engine guarantee. The engine does
  // NOT refuse an edge to a non-existent target; the assertNoOrphanEdges green above holds because the
  // FIXTURES are well-formed, not because the engine enforces it. This tripwire flips red the day the
  // engine starts refusing dangling edges (draft §D "защита сирот" — unbuilt), a promote-me signal.
  it('the engine does NOT refuse a dangling edge (orphan-protection unbuilt, V6 gap)', () => {
    const { engine, store } = newDayEngine();
    const ack = engine.write(
      domainEvent({ ref: 'task:dangling', type: 'task', body: { summary: 'x' }, edges: [{ predicate: 'belongs-to', target: 'project:ghost' }] }),
    );
    expect(ack.ok).toBe(true); // written despite the target not existing
    expect(orphanEdges(store.load())).toHaveLength(1); // the orphan is real, engine let it through
  });
});
