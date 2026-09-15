---
Title: Наблюдатель-MVP — план-как-тесты
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-09-01
Related:
  - docs/architecture/ADR/ADR-0014
  - docs/architecture/ADR/ADR-0004
  - docs/architecture/ADR/ADR-0008
  - UNIT-SPEC-v1 (docs/02-project/core/01-brain/03-unit/)
  - docs/02-project/core/01-brain/01-overview/03-what-memory-is/
---

# Наблюдатель-MVP — план-как-тесты (перепроверен 3 линзами)

## Вектор
«Единица носит свой закон» (Git для памяти) — АСПИРАЦИОННЫЙ вектор проекта. Наблюдатель-MVP проверяет ЧАСТЬ инфраструктуры под него ОДНИМ реальным арендатором — память-наблюдатель за ОПЕРАЦИОННЫМ состоянием самой агент-системы на реальных актах — двумя ЧЕСТНО НАЗВАННЫМИ гейтами: U4 (regression-тест уже существующей readable_by-фичи на реальных данных, НЕ доказательство вектора) + U5 (кросс-адаптерная сериализуемость ОДНОГО движка, НЕ перенос в чужой движок). ⚠️ Эти гейты фальсифицируют свою узкую грань, НЕ весь вектор. Настоящие гейты-с-зубами (F2/F3) и полный вердикт 4-линзовой перепроверки — `adversarial-checkpoint-2026-09-04.analysis.md`.

## Осуществимость: размер S
Все механизмы движка есть и работают (проверено по коду): `resolveRead` default-deny (`core/resolve.ts:242-243`), `visibleTo` (`core/view-compiler.ts:141-143`), `readable_by` reserved key (`core/projection.ts:54,105-108`), durable-store close+reboot (`adapters/store-durable-fs.ts:130-138,170-188`), поля `energy/category` на диске (`scripts/loading-census-2026-09-01-seed.mjs:92-99`). Новое: линза `packages/engine/src/surface/observer.ts` (+тест) по образцу `surface/day-graph.ts`.

## Юниты (describe → исход → фальсификация → якорь → метка)
- U1 observerView — выбирает ОПЕРАЦИОННЫЕ census-узлы, отдаёт {status,summary,category,energy}. RED: узел выпал или energy/category потеряны. `day-graph.ts:18-19,67-72`. [реально, после Шага 0]
- U2 classify — active|open|todo|done|intent|planning из status; attention при energy∈{pain,problem,tension}. RED: pain-узел без attention; done как активный. [реально]
- U3 rank — attention-first свод + счётчики по category (census edges:[] → ключ ранга = attention+status, НЕ degree). RED: attention не наверху. [реально]
- U4 (visibility-as-data, НЕ consent; regression-тест уже существующей readable_by-фичи движка — `core/projection.ts:54,105-108` — НЕ доказательство вектора «единица носит свой закон», см. чекпойнт) — наблюдатель спрашивает движок `resolveRead`, правило = `readable_by:['agent:observer']` НА единице. Меняю данные → набор меняется без кода движка. RED: узел без readable_by виден (сломан default-deny) ИЛИ смена набора потребовала правки движка. Обязателен НЕГ-контроль (узел без readable_by / чужой readable_by — должен быть отсечён). [PEP реально; readable_by на census = близко-δ, data-only]
- U5 (кросс-адаптерная сериализуемость ОДНОГО движка, НЕ перенос в чужой движок — `store-durable-fs.ts:15-17`: один чистый редьюсер `core/projection.project`) — записать → закрыть стор → загрузить ТОТ ЖЕ журнал через ДРУГОЙ адаптер (`store-memory`/`store-md`), вердикт идентичен И приватный узел отсечён. Доп-ассерт: `readable_by` присутствует в сыром journal.jsonl. RED: после переноса приватный виден ИЛИ вердикт разошёлся (закон жил в движке). [реально; ⚠️ store-md НЕ drop-in StorePort — делегирует в MemoryStore; два независимых рельса = store-memory + store-durable-fs]
- U6 render — plain-text (образец `renderDayGraph:174-197`), attention помечены. [реально]

## Шаг 0 (блокер, перед U1-U3)
Сегодня 0/17 census-узлов видимы (default-deny, ACL не записан). Дописать `readable_by` supersede-актами ТОЛЬКО на 9 операционных узлов (`category:work`: stalling-tasks-no-observer, agentic-system-mess, agentic-system-focus, chicken-egg-memory-agents, dvizh-project, naming-fix-dvizh, zhenek-site, main-job-team-change, brother-agentic-onboarding). ⚠️ zhenek-site/brother — про людей: пометить как ОТКРЫТЫЙ вопрос V7 (referent≠self) — включать в наблюдателя ТОЛЬКО операционную грань, не данные о лице; при сомнении исключить до consent-gate.

## Вне scope (guard)
Нет: n8n-исполнителя (порт execute = заморожено-γ), маркетплейса, переноса в чужой ВНЕШНИЙ движок, визуальной карты, тип-иерархии категорий, decay/weight-движка (energy движок не читает, salience reserved-null).

## Честные оговорки (не потерять)
> Полный вердикт 4-линзовой перепроверки (2026-09-04) и настоящие гейты-с-зубами F2/F3 — единственный дом:
> `adversarial-checkpoint-2026-09-04.analysis.md`. Ниже — только локальные напоминания.
- U4 = гейт ВИДИМОСТИ, не согласия (consent enforcement=0, `test/consent-not-enforced.test.ts` tripwire). НЕ называть согласием, и НЕ доказательством вектора (regression существующей фичи).
- U5 = кросс-адаптерная сериализуемость ОДНОГО движка, НЕ V5-перенос в чужой движок.
- V1: `store.load` грузит полное тело (нет дешёвого грайна); на 30 узлах не больно, но V1 НЕ решена.
- ADR-0014 = proposed, ждёт ратификации владельцем (и НЕ закрывает форк «перенос в чужой движок» — см. чекпойнт §4).
