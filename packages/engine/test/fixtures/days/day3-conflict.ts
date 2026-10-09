/**
 * Day-3 — the CONFLICT day (draft §A: бьёт по нескольким ценностям разом). Two sources contradict one
 * fact ("без царапин" партнёр vs "царапина" механик); a consent revoked задним числом; "Артём" из дня-2
 * = давний контакт (person merge); a 3-week-old "в сервисе" fact that has NOT cooled. Специально день,
 * где ЦЕННОСТИ ВЗАИМОДЕЙСТВУЮТ: V3 Доверие × V4 Витальность × V7 Согласие × V2 Тождество.
 *
 * HOLDS (green): freshest-wins supersession, both acts retained (V3×V2). UNMET/UNBUILT (honest reds):
 * consent-revoke enforcement (V7×V3, `test.fails`), identity merge (V2×V6, `test.todo`), cold/salience
 * so a stale fact drops out of a hot view (V4×V1, `test.todo`).
 */
import { domainEvent, type DayScenario } from '../../support/day-scenario.js';

const CONDITION = 'car:А123ВС77:condition';

export const day3Conflict: DayScenario = {
  id: 'day-3-conflict',
  title: 'конфликтный день (4 ценности разом)',
  registry: { status: 'one', 'has-incident': 'many', referent: 'many', 'same-as': 'many' },
  acts: [
    // the referent of the consent probe must be a real node (Ц6 referential integrity).
    domainEvent({ ref: 'user:jenya', type: 'person', body: { label: 'владелец' } }),
    // partner asserts "no scratch"…
    domainEvent({
      ref: CONDITION,
      type: 'fact',
      actor: 'sync:partner',
      body: { scratch: false, asserted_by: 'partner' },
      snapshotHash: 'h-partner',
    }),
    // …mechanic LATER contradicts — a superseding event (freshest wins; partner act stays in the log).
    domainEvent({
      ref: CONDITION,
      type: 'fact',
      actor: 'sync:mechanic',
      body: { scratch: true, asserted_by: 'mechanic' },
      snapshotHash: 'h-mechanic',
    }),
    // a 3-week-old fact that has NOT cooled — there is no salience/temperature field to cool it (V4 gap).
    domainEvent({
      ref: 'car:А123ВС77:service',
      type: 'fact',
      body: { note: 'в сервисе', asserted_at: '2026-08-31' },
    }),
  ],
};

/** The freshest-wins target and its expected converged state (used by asserts). */
export const day3Condition = {
  ref: CONDITION,
  body: { scratch: true, asserted_by: 'mechanic' },
  version: 2,
  retainedActs: 2,
};

/**
 * A consent REVOKED retroactively: an act that asserts a `revoked`-consent edge on the condition fact.
 * DESIRED (T1): `write()` should REFUSE it and the agent should stop traversing that edge. TODAY: it is
 * admitted (consent.status is schema-only) — so `assertRevokedEdgeRefused` fails → wrap in `test.fails`.
 */
export const day3RevokedConsentAct = domainEvent({
  ref: CONDITION,
  type: 'fact',
  actor: 'agent:crm',
  snapshotHash: 'h-revoked',
  edges: [
    {
      predicate: 'referent',
      target: 'user:jenya',
      subjectRole: { consent: { status: 'revoked', asOf: '2026-09-17', evidenceRef: 'blob:consent-1' } },
    },
  ],
});
