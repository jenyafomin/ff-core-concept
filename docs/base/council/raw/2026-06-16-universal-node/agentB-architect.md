# RAW — System-architect · «универсальная единица информации» · 2026-06-16
> Condensed-faithful.

## INTENT
Он описывает не «схему узла», а **runtime типов поверх графа** — мини-СУБД, где сама схема, ограничения,
варианты и логика — ТОЖЕ узлы графа (control plane самохостится, N-022). Паттерны (не названные им): EAV +
типизированный реестр; Schema Registry/JSON-Schema с версиями; namespaces + scoping (плагин = пакет N моделей
в своём неймспейсе, привязан к области проекта = multi-tenancy внутри личного графа); «ветки» = git-подобное
ветвление состояния (не temporal supersedes). Имя: **самоописываемый граф с подключаемым реестром типов, где
schema = данные, не код** (model-driven/metadata-driven). Ключевая интуиция: ОДНА декларация типа служит сразу
ИИ (интерпретация) + движку (валидация/хранение) + человеку (форма) = «самые большие возможности ячейки».

## ГРУППЫ (11; CORE только если нужно движку независимо от типа)
| G | Грань | Корзина |
|---|---|---|
| G1 Identity | id+type+schema@version | CORE |
| G2 Belonging | home + cascade-рёбра | CORE |
| G3 Links | N типизир. рёбер (rel, href) | CORE |
| G4 Time | created/updated/occurred/valid_from/until/supersedes | CORE |
| G5 Trust | epistemic + decision-клапан | CORE (безопасность) |
| G6 Provenance | actor, source | CORE |
| G7 Scope/Tenancy | неймспейс + project-area + principal (system-user≠app-user) | CORE (активируется с модулями) |
| G8 Payload | controlled/flexible/hybrid JSON по контракту типа | MODULE |
| G9 Workflow/State | state, определяется типом | MODULE |
| G10 Branches | альт-версии состояния + активная | ENGINE-механика + MODULE-содержимое |
| G11 Reactivity | триггеры/вычисления/инварианты по типу | MODULE-декл + ENGINE-исполн |
CORE = G1-G7 (движок без знания типа). Новое vs ADR-0001: G7 (Scope/Tenancy), G10/G11 (Branches/Reactivity).

## ВНУТРЕННЯЯ СТРУКТУРА (ключевой запрос)
**Тип-как-узел** `type:model-def`; payload = дескриптор схемы; одна декларация — три проекции.
```yaml
type: model-def   schema: model-def@1   namespace: garden   group: user   project_area: garden-project
payload:
  mode: controlled | flexible | hybrid          # ГЛАВНЫЙ переключатель
  fields:
    species: {kind: string, required: true, ai_hint: "...", ui: {widget: text, label: "Вид"}}
    health:  {kind: enum, values: [healthy,wilting,dead], default: healthy}
    interval:{kind: int, range: [1,90]}
  open: false                                    # false=строго; true=hybrid (extra поля ок)
```
Режимы: controlled (payload обязан соответствовать; enum/range/rules валидируются движком), flexible
(свободный JSON, «запихнуть что угодно»), hybrid (ядро полей + свободный хвост = дефолт).
**Constraints — лестница:** L1 декларативные (range/enum/required — движок исполняет нативно); L2 условные
(when health=dead → require cause); L3 **«функции как условия» = узел `type:predicate`** (чистый предикат
(node,ctx)→bool, исполняется в песочнице, виден ИИ, версионируется, едет с плагином). Правило: **declarative-first**
(предикат только когда деклараций мало; иначе движок не оптимизирует запрос и не объяснит ИИ невалидность).
**Три потребителя одной схемы:** ИИ←description/ai_hint/message; движок←kind/required/range/enum/predicate;
человек←ui/widget/label. **Single Source of Schema:** добавил поле → валидируется + интерпретируется ИИ + в форме.

## ПЛАГИН (N связанных моделей)
`type:plugin-manifest` — узел, владеющий пакетом model-def+predicate+view+relations в неймспейсе:
declares.models[≤20], predicates, relations [{rel, from, to}], constraints_global, requires_core. namespace
= префикс типа (garden/Plant, core/task — core зарезервирован). `group: system|user` ⟂ неймспейс (system=движок
завязан, нельзя удалять; маркетплейс публикует только user). **system-user ≠ app-user = 2 принципала в G7**
(system-user администрирует тип; app-user — чьи данные). project-area = привилегированный home-предок: узлы
плагина каскадно в area; запросы скоупятся; общие личные = personal/root; глобальный апгрейд = мелкие задачи-узлы+перепроверка.

## ВЕТКИ (Branches, N-027.3)
Ветка ≠ supersedes (время) ≠ variant-of (вечные параллельные). Ветка = рабочая альт-линия состояния
(«подготовить новый план, переключиться, вернуться»). **Именованные ветки + указатель активной + diff-оверлей**,
identity узла СТАБИЛЕН (внешние рёбра на id, не на ветку → переключение не рвёт граф). Ветка несёт свой
`epistemic` (черновая=proposal → клапан G5 не даёт действовать наружу). diff=дельта к base (дёшево, lineage явный).
Механика веток=ENGINE; содержимое/семантика мёржа=MODULE.

## АРХИТЕКТУРНЫЙ КЛЮЧ (определяет всё)
**Тип и весь control plane (схемы, предикаты, политики, механика веток) = УЗЛЫ в том же графе, а не код вне его.**
ДА → расширяемость без релиза кода, «всё видно ИИ» и для логики, версии/миграции=узлы, маркетплейс=публикация
узлов. Цена: движок сложнее (исполняет декл. констрейнты + песочница предикатов), нужна мета-схема model-def@1,
declarative-first барьер. Он уже трижды нащупал «ДА» (N-022/N-024/N-027). → зафиксировать как **Принцип 0**.
Риск: производительность/предсказуемость (схема из данных медленнее кода) → митигировать declarative-first +
кэш скомпилир. валидатора на schema@version → отдать critic.
