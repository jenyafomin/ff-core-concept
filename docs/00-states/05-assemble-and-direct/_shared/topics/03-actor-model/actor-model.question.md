---
node_type: question
title: "U3 — actor/agent не смоделирован: три роли SubjectRef, ViewerResolver paper-freeze"
status: resolved
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 8
resolution: ./synthesis/02-resolution.synthesis.md
correction: "⚠️ Спек ниже ошибочно оформил `subject` (types.ts:160) как 'о ком запись/чьё согласие' — критик отклонил: это `GrantBody.subject` = grant-target (capability-grantee), НЕ держатель согласия. 'Data subject' согласия в коде не представлен. См. resolution §1/§4."
kind: knowledge
needs-home: "D3/DV (T-actor-identity) · S2 (deref-seam берёт viewer) · kernel I-7 (resolve = единственный PEP)"
run_index: ../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
task_pool: ../../task-pool.md
related:
  - ../02-truth-keystone/
  - ../../../plans/02-S2-lay-forms/
lens: engineering/architectural — system-architect (границы) + analyst (вглубь/зависимости) + critic (адверсариал)
---

# U3 — Модель актора/агента (design-набросок, НЕ решение)

## Вопрос (что закрываем)
Субстрат сегодня НЕ моделирует актора. `SubjectRef` — голая строка, которую клиент подставляет **на
доверии**; `ViewerResolver` объявлен, но заморожен на бумаге (`TODO(M5)`). Пока личность актора не
резолвится, `resolve()` (I-7, единственный PEP) гейтит доступ по **недоказанному субъекту** — забор
стоит, но в него можно войти под любым именем.

**Ставка (зачем сейчас).** Идентичность — одна из трёх опор «доверяемой композиции» (тождество · правда ·
согласие; SESSION-CONTROL §3). Правда закрыта итер.6 (6 осей), согласие частично (R4-меню итер.2).
Идентичность — незакрытая опора. Пересекается с **retrofit-НЕВОЗМОЖНЫМИ формами S2** (deref-seam берёт
viewer; admission-choke-point) → если форма актора не заложена сейчас, её нельзя добавить потом (Закон-1).

**Границы (что НЕ делаем).** Это НЕ реализация `ViewerResolver` (это M5-стройка, ждёт «строй»). Это
**design-набросок пространства**: какие роли актора существуют, где они уже врезаны в типы, какую МИНИМАЛЬНУЮ
форму (Закон-1: choke-point/идентичность, не enforcement) надо зарезервировать сейчас, и какой owner-форк
(если есть) отсюда рождается. НЕ дублировать `T-actor-identity` (D3/DV) — эта нода даёт **модель ролей +
рекомендацию формы**, не переписывает существующую задачу.

## Якоря реальности (вербатим, grep-verified 2026-08-09)
- `packages/engine/src/core/types.ts:14` — `export type SubjectRef = string; // "agent:ff-personal", "user:jenya", or a glob "agent:*"` — доверенная строка, без резолвера.
- `packages/engine/src/core/types.ts:113` — `resolve(key: string, viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision;` — PEP берёт viewer, но viewer недоказан.
- `packages/engine/src/core/types.ts:151` — `viewer: SubjectRef;` (роль ЧИТАТЕЛЯ — кто спрашивает доступ).
- `packages/engine/src/core/types.ts:160` — `subject: SubjectRef;` (роль СУБЪЕКТА — о ком запись/чьё согласие).
- `packages/engine/src/core/types.ts:217` — `actor: SubjectRef;` (роль АВТОРА акта — кто записал).
- `packages/engine/src/ports/viewer-resolver.ts:2` — `S6 · ViewerResolver — PAPER-FREEZE ONLY at M0.`
- `packages/engine/src/ports/viewer-resolver.ts:8` — `TODO(M5): implement per-surface identity resolution (Telegram uid → user:… / agent:…).`
- `packages/engine/src/ports/viewer-resolver.ts:14` — `resolveViewer(surfaceIdentity: string): SubjectRef;` — форма резолва врезана, тело пусто.
- `docs/02-project/core/00-kernel/invariants.md:54` — `actor подставляется клиентом на доверии (см. связку с I-7).`
- `docs/02-project/core/00-kernel/invariants.md:134` — `I-7 · resolve() — единственный PEP; НИ ОДИН путь к данным его не обходит`.

## Призмы для команды (task-спек, шаг b)
- **system-architect (границы):** три роли `viewer/subject/actor` — это одна модель актора или три разных
  контракта? Где choke-point резолва (Закон-1: одна форма, retrofit-невозможна)? Что МИНИМАЛЬНО заложить
  сейчас, чтобы не переписывать типы потом? Как связано с deref-seam (S2, viewer) и admission (S2, subject-класс)?
- **analyst (вглубь/зависимости):** проследить, кто СЕГОДНЯ подставляет каждую из трёх ролей и откуда
  (grep вызовов `resolve(`, `actor:`, `viewer`), где строка приходит «на доверии», что сломается при
  подмене (spoofing-путь), пересечение с erasure (`subject` = чьё согласие/стирание) и с I-7-обходами.
- **critic (адверсариал, ДО «готово»):** где набросок сам себя обманывает? Тавтология «резолвер решит»?
  Не притащили ли enforcement туда, где Закон-1 разрешает только форму? Реальный ли owner-форк или
  агент-решаемое? Вердикт CLEAN/DIRTY.

## Выход
- `analyses/01-actor-roles.analysis.md` (architect) · `analyses/02-actor-dataflow.analysis.md` (analyst)
- `synthesis/01-critic-check.critic.md` (критик, CLEAN/DIRTY) · при CLEAN — итог + рекомендация формы + форк?→OWNER-QUEUE
- Статус ноды: `draft → resolved | deferred` + строка в RUN-INDEX (итер.8).
