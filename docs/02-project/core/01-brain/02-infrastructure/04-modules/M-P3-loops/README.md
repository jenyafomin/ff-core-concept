---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: module-deepdive
module: M-P3
Related:
  - ../../MODULES.md
  - ../../README.md
  - ../M-G2-orchestrator/README.md
  - ../M-G3-type-registry-policy/README.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../../../02-agents/01-orchestration/README.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/00-organization/session-handoff/2026-07-12-loop-engineering-repo-analysis/03-db-design-tasks.md
---

# M-P3 — Петли / Loops (проектный / plug-in)

## Назначение
Машина **автономных циклов** над субстратом: рецепт-паттерн (`Pattern`) порождает экземпляры-шаги (`Task`),
которые исполняет агент, а **пропускает дальше только verifier-гейт**. Три защиты от разноса: **verifier-гейт**
(«done» ставит не исполнитель), **worktree-изоляция** (работа идёт в отдельной ветке-песочнице), **circuit
breaker** (петля тормозит по порогу неудач). Ключ: петля НЕ держит свой стейт-стор — она **пишет в общий
append-only журнал** (Observation/WorkLog), а гейт/breaker = **read-time проекция того же журнала** (I-2, без
второго источника истины).

## node-type / edge-type
- **node-type `pattern`** — декларативный рецепт петли. Payload: `goal, cadence, risk, phases[], humanGates[],
  tools[]/skills[], cost{noop,report,action,dailyCap,earlyExit}, weekOneMode(L1|L2|L3)`. Данные, не код.
- **node-type `task`** (LoopState) — экземпляр/шаг. Паспорт: `phase, worktreeRef, breakerCount, doneBy`;
  инвариант **`doneBy` заполняется только verifier-агентом**. Payload — проектный (concept, дифф).
- **edge-type `instance-of`** — `task` → `pattern` (какой рецепт породил шаг).
- **edge-type `executed-by`** — `task` → AgentSlot-исполнитель (M-G2).
- **edge-type `verified-by`** — `task` → verifier-AgentSlot / Observation-вердикт; **несущее ребро гейта**
  (класс = assertion: несёт суждение, требует провенанс/согласие).
- **edge-type `derived-from`** — `task` → Concept/источник; DAG-инвариант на derived (провенанс, «почему шаг»).

## policy-as-data
Пороги гейтов и circuit-breaker — **не хардкод, а policy-узлы M-G3** (`governed-by`):
- `verifierPolicy` — что считается «pass», кто вправе быть verifier (роль ≠ исполнитель).
- `breakerPolicy` — порог `breakerCount` до размыкания, окно, cooldown; **circuit-breaker = policy, не поле кода**.
- `costPolicy` — `dailyCap`/`earlyExit`/no-op-экономия (питает ценность «экономия токенов»).
- `humanGatePolicy` — на каких фазах/риске нужен человек-in-the-loop (валвовое согласие на необратимое).
Каскад тот же: `Конституция > policy > integrity`; проект переопределяет пороги для своего scope, не переписывая.

## Поведение-в-БД (что декларативно / что движок)
- **Декларативно (данные):** `pattern` (рецепт фаз/cost), пороги как policy, `worktreeRef` как позиция на оси
  `storageLevel` (изоляция = residency, стык M-G4), `verified-by`/`derived-from` как рёбра.
- **Движок (исполнение):** прогон фаз, создание/слияние worktree, **гейт как read-time вид** `effective-gate`,
  инкремент `breakerCount` из журнала, установка `doneBy` при валидном verifier-Observation. Ничего не «зашито» —
  движок оказывает услугу декларации.

## Как гейт использует журнал (несущий механизм)
Петля на каждой фазе **аппендит Observation/WorkLog** (переход фазы, вердикт verifier, стоимость, отметка неудачи).
Гейт **не хранит своё состояние** — он вычисляется как проекция над журналом:
`done` ⟺ существует Observation, авторизованный verifier-слотом, с вердиктом pass; **circuit размыкается** ⟺ в
журнале ≥ `breakerPolicy.threshold` подряд-неудач. Тот же журнал читают кокпит (M-P4) и метаболизм памяти (M-G1) —
**общий позвоночник, а не шина на модуль**. Гейт = read-time, поэтому «правда» одна и rebuild-с-нуля возможен.

## Память
Паттерн-узлы (durable, реюзабельны) + `task`-узлы (bitemporal: жизнь шага, аудит «почему решил» Г9) +
append-only журнал как долговременный след прогонов. Метаболизм/забывание завершённых `task` — слоем M-G1.

## Global / project
**Проектный / plug-in.** Механизм петли переносим (FF ↔ agents-manager), но конкретные `pattern`-узлы и пороги —
данные проекта (`scope=project`). Подключается как модуль: привозит свои node/edge-типы в реестр M-G3, не меняя схему.

## Кросс-связи
**M-G2 оркестратор** — даёт исполнителя/verifier-слоты (`executed-by`/`verified-by`), диспетчеризует Task ·
**M-G1 память** — субстрат узлов/рёбер, журнал, метаболизм завершённых · **M-G3** — пороги/breaker/verifier как
policy, регистрация типов, гейт-как-policy · **M-G4** — `worktreeRef` = уровень локальности изоляции ·
**M-P4 кокпит** — читает тот же журнал для «кто-где-сколько»/cost.

## 🔴 Сейчас (ретрофит невозможен)
Инвариант **`doneBy` = только verifier** · `verified-by`/`derived-from` как рёбра (assertion + DAG) ·
петля пишет в **общий** append-only журнал (не свой стор) · `breakerCount`/`worktreeRef` в паспорте `task` ·
circuit-breaker/cost/verifier как **policy-узлы**, не константы.

## 🟢 Позже (дёшево)
Материализация `effective-gate` (cache для быстрой диспетчеризации) · авто-worktree раннер · богатые cost-модели ·
адаптивные пороги · библиотека переиспользуемых `pattern` · кросс-проектный шаринг паттернов.

## Открытые вопросы Fable
1. **Гейт: чистая read-time проекция журнала или материализованное поле `gateState` на `task`?** Проекция = одна
   правда (нет дрейфа, главный риск консилиума), но дороже на горячей диспетчеризации; поле = быстро, но второй
   источник истины. Кандидат: проекция сейчас, материализация-как-cache позже (🟢).
2. **Verifier — обязательно ДРУГОЙ слот, или допустим self-verify по low-risk policy?** (роль vs экономия слотов).
3. **worktree — узел субстрата (`node-type worktree`) или чистый `worktreeRef`-указатель в паспорте `task`?**
