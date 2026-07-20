---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: edge-type-registry
domain: agents-orchestration
Related:
  - README.md
  - node-types.md
  - ../../01-brain/values/06-relyacionnost/02-typed-edges-and-cascade
---

# Edge-types домена 02 (реестр) — 2 класса

Тот же базис, что у домена 01: **thin-ref** (структурная ссылка, дёшево, без утверждения) vs
**assertion-edge** (несёт claim/evidence — cost, verdict, provenance). Разделение важно для доверия
(Ц-3): thin-ref не проверяется на правдивость, assertion — да.

## Класс thin-ref (структура, «где что привязано»)

### bound-to
`conversationRef → AgentSlot`. Итог каскадной проекции endpoint-биндинга (C4): чат → топик → слот, как
каскад PROMPT.md шлюза (chatId-уровень → threadId-уровень). Читается как **вид `effective binding`**
(read-time resolve каскада), не хранится денормализовано.

### replica-of
`AgentSlot → AgentSlot` (родитель). Штамповка реплики флота. Структурная ссылка на происхождение слота;
**не тащит память** — Session у реплики своя, пустая.

### channel-bound
`ChannelBinding → channel-type-row`. Привязывает конкретный `conversationRef` к типу канала (telegram/
discord/email/cron) и его проекционным полям (Telegram → `Topic.threadId`). Отдельно от `bound-to`,
потому что это привязка **к адаптеру**, а не к исполняющему слоту — один conversationRef может быть
`channel-bound` без ещё активного `bound-to` (канал существует, слот ещё не резолвлен).

## Класс assertion-edge (утверждение, несёт evidence)

### reports-to
`Observation/WorkLog → AgentSlot | Session`. Атрибуция записи журнала: «эта работа/cost/phase
принадлежит этому слоту/сессии». Питает M-P4 (агрегация «кто-где-сколько»). Несёт `cost`, `phase` —
не просто указатель, а утверждение с данными.

### verified-by
`Task/Pattern → Observation` (запись верификатора). Инвариант Loop Engineering: **исполнитель не ставит
done — ставит верификатор**. Ребро несёт verdict (pass/fail) + provenance (кто/что проверил). Основа
гейтов петель (M-P3) и доверия к завершённости.

## Кросс-класс правило
Все 5 типов — записи в открытом реестре `edge-type` (малый seed, растёт INSERT-ом, не ALTER). Каждое
новое ребро при добавлении объявляет класс (thin-ref/assertion) явно — иначе реестр типов превращается
в свалку синонимов (риск, названный в синтезе БД-модуля, §«Общий риск»).
