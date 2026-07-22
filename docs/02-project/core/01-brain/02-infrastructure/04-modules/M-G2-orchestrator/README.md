---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: module-deepdive
module: M-G2
Related:
  - ../../MODULES.md
  - ../../README.md
  - ../../2026-07-12-orchestration-board.md
  - ../../../../02-agents/01-orchestration/README.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-db-module/C-orchestration-tenancy.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-basis-node-edge.md
  - ../M-P3-loops/README.md
---

# 🎛️ M-G2 — Оркестратор / диспетчер (control-plane, глобальный)

> Deep-dive по единому шаблону. Оркестрация — **не отдельный код и не отдельная БД**, а ПОДГРАФ узлов и
> типов рёбер на том же субстрате (M-G1) + движок над append-only журналом. «Control-plane над data-plane».

## Назначение
Control-plane флота агентов: кто исполняет, где, на каком канале, с какой памятью. Держит цепочку
`Personality → AgentSlot → Session`, диспетчеризует ходы, гарантирует **≤1 Active** на слот, читает
общий журнал-шину для гейтов/кокпита. Знает «где что лежит», **не вскрывая payload** (тонкие паспорта +
`fetchInstruction`). Пере­носим FF ↔ agents-manager: та же модель.

## Node-type / edge-type (подграф оркестрации)
Узлы (строки реестра `node-type`, не таблицы):
- **Personality** — шаблон-самость, глобальна (одна на флот).
- **AgentSlot** — резервирование: `personalityId, mode(bound|background|task), replicaOf?, boundConversationRef?`.
- **Session** — память слота (память НЕ шарится между репликами).
- (используются) **conversationRef** (channel-нейтральный `channel:conversationId`) и записи журнала.

Рёбра (thin-ref, seed-реестр типов, endpoint = `canonicalId`, DAG на derived):
`bound-to` (Slot→Personality/Topic) · `replica-of` (Slot→Slot) · `reports-to` (Slot→Slot/Session) ·
`verified-by` (ход→verifier, стык с M-P3). «≤1 Active» — **partial unique index**, а не код.

## Policy-as-data (global vs project)
Настройки оркестрации = **policy-узлы со `scope` + override-каскад**, не хардкод per-проект.
Глобальное (`orchestrator-global`): реестр Personality, дефолты режимов, cost-cap, «≤1 Active».
Проектное: биндинги каналов, лимиты, выбор Personality — **override** поверх глобального (каскад
`Конституция > policy > integrity`, как каскад PROMPT.md шлюза чат→топик→слот).

## Поведение-в-БД (движок над данными)
- **Диспетчер:** входящий `conversationRef` → вид **effective binding** (каскадная проекция чат→топик→слот)
  → активная Session. Новый ход = запись в журнал, не мутация.
- **≤1 Active:** держит partial-index, не императивная блокировка.
- **Чтение журнала-шины:** гейты/cost-cap и «эффективное состояние флота» — read-time виды над журналом.
Всё «живое» декларативно (I-2: поведение — данными, исполнение — движком). Новый канал/режим = INSERT
строки типа, ноль схемы (3 plugin-порта: node-type/edge-type/view-def).

## Память (что требует)
Свой **подграф**: Personality/Slot/Session-узлы + рёбра оркестрации + `DataResidency` (тонкие паспорта).
Пишет и читает **общий позвоночник** — `Observation/WorkLog` (append-only), НЕ свой журнал.

## Журнал-шина (общий позвоночник)
Все 4 механики (агенты · telegram · память · петли) пишут в ОДИН append-only журнал
`(tenantId, slotId, sessionKey, conversationRef, phase, cost)`. M-G2 — **и писатель (ходы), и читатель
(диспетч/гейты)**. Петли (M-P3) читают для гейтов; кокпит (M-P4) — «кто-где-сколько»; память (M-G1) —
метаболизм. Один журнал, много читателей — не шина-на-модуль.

## Global / project
**Глобальный (M-G*).** Ядро (цепочка, ≤1 Active, журнал, диспетчер) — универсально. Per-project —
только ДАННЫЕ (биндинги, override-policy, выбор Personality), не отдельный движок.

## Кросс-связи (через какие рёбра / БД)
- **M-G1 (память):** Slot/Session — узлы на субстрате M-G1; Session ↔ память агента через рёбра.
- **M-P2 (telegram):** даёт `conversationRef`; `Topic.threadId` — проекция, не поле оркестрации.
- **M-P3 (петли):** Pattern/Task — те же узлы; `verified-by` — гейт; журнал общий.
- **M-P4 (кокпит):** читает журнал M-G2 для наблюдаемости и cost.

## 🔴 Сейчас / 🟢 позже
🔴 `tenantId` с дефолтом · UUID `canonicalId` · channel-нейтральный `conversationRef` · `mode`+`replicaOf`
на слоте · **partial-index «≤1 Active»** · append-only журнал · seed-реестр рёбер оркестрации.
🟢 менеджмент флота реплик · ACL/visibility enforcement · материализация видов (live/cache/copy) ·
кросс-тенант шаринг · push-реактивность диспетчера · физический раскол per-project.

## ⚠️ Риск
**Control-plane как второй источник истины** (F3 на весь флот). Дисциплина: паспорт = ВЫВОДИМАЯ проекция
локальной истины, поток снизу вверх, руками не правится, **rebuild-с-нуля — операция первого дня**.

## Открытые вопросы (Fable)
1. **`reports-to` — дерево или DAG?** Может ли слот докладывать нескольким (супервизор + verifier)
   без нарушения DAG-инварианта на derived-рёбрах?
2. Сколько **разных агент-модулей** цепляются к одному оркестратору и по каким рёбрам?
3. Репликация: `replica-of` штампует слот — а Session-память клонируется, ветвится или всегда пустая?
