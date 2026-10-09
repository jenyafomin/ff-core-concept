/**
 * Day-1 — the SIMPLE day (draft §A "эталон как должно быть"). A clean Thursday: message · task ·
 * meeting · person · project. Clean observation → thin passport (3-4 fields, readable без вскрытия
 * тела); a `belongs-to` edge (task → project). This is the BASELINE the noisy/conflict days deviate
 * from. Проверяет V1 Читаемость (грань видна по паспорту).
 *
 * Synthetic data only — no real owner PII (a `label`, not a `name`; no phone/email inline).
 */
import { domainEvent, type DayScenario } from '../../support/day-scenario.js';

export const day1Simple: DayScenario = {
  id: 'day-1-simple',
  title: 'простой четверг (эталон)',
  // `belongs-to` is a one-relation (a task belongs to exactly one project); `involves` accumulates.
  registry: { 'belongs-to': 'one', involves: 'many' },
  acts: [
    domainEvent({ ref: 'project:infra', type: 'project', body: { label: 'инфраструктура' } }),
    domainEvent({ ref: 'person:client', type: 'person', body: { label: 'клиент' } }),
    domainEvent({ ref: 'msg:thu-inbox', type: 'message', body: { summary: 'разобрать входящие', channel: 'email' } }),
    domainEvent({
      ref: 'task:pay-hosting',
      type: 'task',
      body: { summary: 'оплатить хостинг', status: 'open' },
      edges: [{ predicate: 'belongs-to', target: 'project:infra' }],
    }),
    domainEvent({
      ref: 'meeting:client-eve',
      type: 'meeting',
      body: { summary: 'встреча с клиентом', when: 'вечер' },
      edges: [{ predicate: 'involves', target: 'person:client' }],
    }),
  ],
};
