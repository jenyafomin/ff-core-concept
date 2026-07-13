---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-13
Scope: project
node_type: reference-deepdive
Related:
  - ./CONTEXT.md
  - ./02-MECHANISMS-brain-interaction.md
  - ../../../02-project/core/01-brain/architecture/modules/M-P3-loops/README.md
  - ../../../02-project/core/01-brain/architecture/MODULES.md
externalRefs:
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/01-project/references/loop-engineering/VERDICT.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/01-project/references/loop-engineering/raw/source-extract.md
source: github.com/cobusgreyling/loop-engineering (MIT, ~6.8k⭐)
---

# 🔬 ГЛУБОКИЙ РАЗБОР — loop-engineering (за пределами существующей выжимки)

> Что нового по сравнению с `VERDICT.md`/`source-extract.md`: те два файла — **краткая карта**. Здесь —
> **вскрытие механики по файлам первоисточника** (registry.schema.json, 4 skills, STATE/LOOP/AGENTS,
> docs/safety, failure-modes, anti-patterns, multi-loop, primitives-matrix, полный паттерн PR Babysitter).
> Каждый блок помечен: **[П]** переносимо в brain / **[С]** специфично для их GitHub-воркфлоу.
> Метки готовности: 🟢 ясно · 🟡 спорно · 🔴 заложить сейчас.
>
> Пробелов от 404/rate-limit в этой сессии не было; всё ниже — из живых raw-файлов репо. Не проверены целиком:
> `templates/*`, `operating-loops.md`, `loop-design-checklist.md`, `pattern-picker.md` (не блокируют разбор).

---

## 0. Одна мысль, которую надо не потерять

Точка силы = **петля, а не промпт**. Петля — это «recursive goal: define purpose, let the agent iterate
(with sub-agents and external memory) until done or until the loop escalates to a human» (`docs/concepts.md`).
Для brain это значит: **петля не код и не разговор — это ДАННЫЕ (узел-рецепт) + журнал следов + read-time
проекции гейтов**. Ровно наш `policy-as-data`. Их репо — независимое подтверждение курса brain; мы берём НЕ
их npm-CLI (это [С]), а их **модель данных и контракты** ([П]).

---

## 1. Анатомия петли по фазам (полный цикл)

Из README + `docs/concepts.md` + паттерна PR Babysitter. Канонический цикл:

```
Schedule/Automation → Triage Skill → Read/Write STATE → Isolated Worktree →
Implementer Sub-agent → Verifier Sub-agent → MCP/Git/Tickets →
Human Gate (safe→auto-commit; risky→escalate) → back to Schedule
```

Разложение фаз на примере **PR Babysitter** (`patterns/pr-babysitter.md`) — 5 фаз:
1. **Discovery** — найти открытые PR команды/watchlist.
2. **Triage & Assessment** — применить triage-skill, найти CI-фейлы и actionable-комменты.
3. **Automated Response** — спавн `minimal-fix` суб-агентов на красные тесты; предложить патчи.
4. **Readiness Check** — когда всё зелёное → флаг «ready to merge» ИЛИ уведомить человека.
5. **Idle Management** — поднять «спящие» PR к закрытию; обновить state и PR-тред подписанным бот-комментом.

**[П]** Фазность (`phases[]`, ≥2 обязательно) — это то, что brain кладёт в паспорт `pattern`. Каждая фаза =
переход, который **аппендится в журнал** как Observation. Наш M-P3 уже имеет `phases[]`; новое здесь — **5
фаз PR Babysitter показывают, что «Idle Management» и «Readiness Check» — это ОТДЕЛЬНЫЕ read-time проекции над
журналом**, а не действия (см. Механизм M-08 в файле 02).
**[С]** Конкретика «PR/CI/rebase» — их GitHub-домен; в brain это заменяется на доменные фазы проекта.

---

## 2. Полная схема registry (`patterns/registry.schema.json`) — что каждое поле реально контролирует

Корень: `{ patterns: [ ... ], minItems: 1 }`. Каждый паттерн:

| Поле | Тип / валидация | Что РЕАЛЬНО контролирует | Перенос |
|---|---|---|---|
| `id` | string, regex `^[a-z][a-z0-9-]*$` | Стабильный ключ для `instance-of`-ребра, дедуп, реестр | 🔴 [П] = `canonicalId` узла |
| `name` | string, ≥3 | Человекочитаемое имя (кокпит) | [П] |
| `file` | string, regex `^[a-z0-9-]+\.md$` | Указатель на md-тело паттерна (payload) | [П] = наш паспорт/payload split |
| `goal` | string, ≥10 | Цель петли; вход для goal-audit («дрейф от цели») | 🟢 [П] |
| `cadence` | string, regex `^[0-9]+[mhd](-[0-9]+[mhd])?$` | Расписание (диапазон, напр. `5m-15m`, `1d-2h`) | [П] как policy-поле |
| `risk` | enum `low\|medium\|high` | Ключ ко ВСЕМ гейтам: гейт/allowlist/human-gate читают risk | 🔴 [П] несущее поле |
| `tools[]` | enum `grok\|claude-code\|codex\|openclaw\|opencode\|github-actions\|cursor\|windsurf\|aider`, ≥1 | Какой агент-харнесс исполняет | [С] их список; [П] сам принцип «tools как данные» |
| `skills[]` | string ≥2, ≥1 | Какие skill-узлы петля обязана загрузить | 🔴 [П] = рёбра `requires-skill` |
| `state` | string, regex `^[A-Za-z0-9-]+\.md$` | Ссылка на state-файл петли | [П] → у нас это ЖУРНАЛ, не файл (см. §4) |
| `phases[]` | string ≥2, ≥2 | Фазы цикла | 🔴 [П] |
| `human_gates[]` | string ≥2, ≥1 | Точки обязательного человека (минимум ОДИН гейт всегда!) | 🔴 [П] инвариант |
| `starter` | string, опц. | Clone-and-run кит (grok/claude-code/codex/opencode) | [С] |
| `week_one_mode` | enum `L1\|L2\|L3`, опц. | Стартовая автономность (report→assisted→unattended) | 🔴 [П] |
| `token_cost` | enum `low\|medium\|high\|very-high`, опц. | Грубый класс стоимости (срез в кокпите) | [П] |
| `cost{}` | объект, опц. | Точная эконом-модель ↓ | 🔴 [П] |
| `cost.tokens_noop` | int ≥1000 | Стоимость пустого прогона (цель: большинство прогонов = noop) | [П] |
| `cost.tokens_report` | int ≥1000 | Стоимость L1-отчёта | [П] |
| `cost.tokens_action` | int ≥1000 | Стоимость L2-действия (worktree+fix+verify) | [П] |
| `cost.suggested_daily_cap` | int ≥10000 | Дневной потолок токенов на паттерн | 🔴 [П] |
| `cost.early_exit_required` | bool | Требовать раннего выхода при пустом watchlist | 🔴 [П] |

**Вывод:** схема — это **декларативный контракт петли**. Гибкость = «менять поведение = менять ПОЛЕ».
`risk` — центральный ключ, к которому цепляются 3 подсистемы (allowlist, human-gate, budget). Обязательность
`human_gates[] ≥ 1` — это **жёсткий инвариант «нет петли без хотя бы одного человеческого клапана»**;
в brain это ложится как **policy-инвариант M-G3**, а не совет.
**[С]:** `tools`-enum и `starter` — их экосистема; в brain `tools[]` = ребро к AgentSlot-типам (M-G2).

---

## 3. Skills как единицы (что ВНУТРИ каждого)

Skills у них = `SKILL.md`-модули «устойчивого знания проекта». 4 несущих skill'а — это фактически
**исполняемые контракты петли, вынесенные в данные**. Каждый ложится на brain как узел-политика/процедура.

### 3.1 `loop-triage` — сортировщик сигнала → структура
- **Вход:** CI/test-фейлы (24ч), открытые issues/Linear, коммиты в main (24–48ч), чат-треды, **текущий
  state-файл** (прошлое знание).
- **Выход:** markdown с 4 секциями: `High-Priority` · `Watch` · `Noise/Ignore` · `State Updates`.
- **Правила:** «Be brutally concise», high-priority = «то, что разумный инженер стал бы разбирать сегодня»,
  «When in doubt → Watch или Noise, не создавай работу», не предлагать архитектурных изменений в триаже.
- **[П]:** это **read→classify→write-back в журнал** механизм. В brain triage = агент, который читает срез
  графа и аппендит классифицированные Observation. Категории (High/Watch/Noise) = **policy-поля**, не хардкод.

### 3.2 `loop-verifier` — независимый чекер (несущий инвариант)
- **Вход:** сводка+дифф исполнителя, исходный issue/CI-фейл, тест/линт-команды проекта, разрешённый scope файлов.
- **Процедура — 4 шага, ВСЕ должны пройти:** (1) Scope validation (только релевантные файлы, нет denylist-нарушений),
  (2) Intent alignment (изменение адресует заявленную цель), (3) Test execution (**сам гоняет тесты**),
  (4) Integrity check (нет отключённых тестов/закомmenченных ассертов).
- **Вердикты:** `APPROVE | REJECT | ESCALATE_HUMAN`. Дефолт — **REJECT until proven otherwise**.
  `ESCALATE_HUMAN` = когда тесты не запускаются из-за окружения.
- **Контракт:** «Do not trust implementer's claim that tests passed — run them»; «Verifier operates
  independently; never shares the implementer role».
- **Выход:** структурированный вердикт (Verdict + Evidence: команды+результат + Scope check).
- **🔴 [П]:** это ровно наш инвариант M-P3 «`doneBy` заполняет только verifier». Новое из разбора: **вердикт —
  не булеан, а 3-значный (APPROVE/REJECT/ESCALATE)** + **дефолт REJECT** + **обязательное СВОЁ исполнение тестов
  (evidence), а не доверие исполнителю**. Это уточняет наше `verifierPolicy`: pass ≠ «исполнитель сказал ок»,
  pass = «verifier сам предъявил evidence». Ложится как поля `verified-by`-ребра (assertion + провенанс evidence).

### 3.3 `loop-constraints` — guardrail ПЕРЕД любым действием
- **Назначение:** активируется до всех прочих действий агента; читает и применяет `loop-constraints.md`.
- **Старт:** печатает `Constraints loaded from loop-constraints.md: N rules active.`, грузит правила в память,
  **проверяет флаг `loop-pause-all` → мгновенный выход если стоит**.
- **Формат декларации** (`loop-constraints.md`, корень проекта), секции: **Paths** (что нельзя редактировать) ·
  **Code** (ограничения фиксов: тесты обязательны, one-fix-per-run) · **Push & Merge** (контроль git-действий).
- **Точки проверки:** перед edit (путь vs denylist → escalate), перед push/merge (перечитывает Push&Merge),
  перед fix (требует прохождения тестов, один фикс за прогон).
- **Дефолт-фолбэк** (если файла нет): защищены `.env, .env.*, auth/, payments/, secrets/, credentials/`,
  блок auto-merge в main, запрет отключения тестов, escalate после 3 неудач.
- **Интеграция:** constraints **переопределяют** приоритет триажа, ограничивают доступ `minimal-fix` к файлам,
  задают denylist для `loop-verifier`, могут ужесточать бюджет из `loop-budget.md`.
- **🔴 [П]:** это **отдельный механизм «constraints-as-data + startup-гейт»** (см. M-11 в файле 02). Мощная идея:
  guardrail — не разбросан по промптам, а ЕДИНЫЙ узел-политика, читаемый ПЕРЕД действием, с явным счётчиком
  «N rules active» (наблюдаемость) и приоритетом НАД остальными skill'ами. Ложится как policy-узел M-G3 с
  каскадом `Конституция > constraints > остальное`.

### 3.4 `loop-budget` — эконом-сторож + анти-runaway
- **Поля** (`loop-budget.md`): дневные капы на паттерн, флаг `loop-pause-all`, `max sub-agent spawns/run`,
  секция «Alerts This Period».
- **Проверки на старте прогона:** (1) посчитать дневной расход из `loop-run-log.md` (последние 24ч);
  (2) при **≥80% капа** → «report-only mode» (блок суб-агентов, выкл авто-фикс); (3) при **≥100% или
  `loop-pause-all`** → «exit immediately» с однострочной пометкой в STATE; (4) если watchlist/state без
  actionable-элементов → **выход <5k токенов, без спавна суб-агентов**.
- **Пишет:** аппендит в `loop-run-log.md` **JSON-объект** с полями: `run_id, pattern, duration_s, items_found,
  actions_taken, escalations, tokens_estimate, outcome`; обновляет «Alerts This Period»; однострочник в STATE при выходе.
- **🔴 [П]:** это **машина economics-as-data**. Ключевые пороги 80%/100% и early-exit <5k = **policy-поля**, не
  константы. JSON-строка run-log = **точная схема append-only журнала** (см. §4). Наш `costPolicy` в M-P3 надо
  дополнить полями `report_only_threshold`, `max_subagent_spawns`, а run-log — этими 8 полями.

**Наблюдение по всем 4 skill'ам:** это **не «умения», а исполняемые политики** над одним журналом
(`loop-run-log.md`) и одной памятью (`STATE.md`). Триаж пишет, бюджет считает по журналу, constraints гейтит
до, verifier гейтит после. **[П]:** brain реализует их как 4 policy/procedure-узла над ОБЩИМ журналом M-G1 —
никакого отдельного стора на skill.

---

## 4. STATE.md как модель памяти (все секции + семантика run-log)

`STATE.md` = «durable spine external to conversations». Секции (из живого файла + template):
1. **Header** — Title, **timestamp**, maintenance status.
2. **High Priority** — активные метрики готовности + in-flight релизы (пример: «loop readiness score ≥ 58»).
3. **Watch List** — рабочие элементы со ссылками на issue/PR.
4. **Housekeeping** — свежие мержи, чистка веток, бампы зависимостей *(секции НЕ было в старой выжимке)*.
5. **Recent Noise** — проигнорированное (в этот прогон пусто).
6. **Run log (footer)** — источник-воркфлоу + ссылка на доку.

**Семантика run-log** (несущее для brain): это НЕ произвольный текст, а **append-only лог структурированных
записей**. Из `loop-budget`: каждая запись = JSON `{run_id, pattern, duration_s, items_found, actions_taken,
escalations, tokens_estimate, outcome}`. Файл: `loop-run-log.md`, отдельно от STATE.

**Разделение памяти на 2 слоя (ключевой инсайт):**
- **STATE.md = durable «текущая картина»** (High Priority / Watch / Noise) — перезаписываемая проекция «что важно сейчас».
- **loop-run-log.md = append-only «история прогонов»** — иммутабельный след, из него считается бюджет и circuit breaker.

**🔴 [П] прямое попадание в brain:** это ровно наша модель «журнал (append-only) + read-time проекции». STATE =
**материализованная проекция** над run-log (durable snapshot). Наш M-P3 уже говорит «гейт/breaker = read-time
проекция журнала»; разбор STATE **подтверждает и уточняет**: High Priority/Watch/Noise — тоже проекции, а
единственный источник истины = append-only run-log. Housekeeping-секция = проекция «что метаболизм памяти
(M-G1) уже прибрал».
**[С]:** конкретные пункты (npm-релизы, star-history) — их проект.

---

## 5. Cost-модель (реальные числа + early-exit механика)

Из паттерна PR Babysitter (`cost{}` + таблица):
| Сценарий | Токенов/прогон | Контекст |
|---|---|---|
| Пустой watchlist (no-op) | **~3k** | Цель — БОЛЬШИНСТВО прогонов; early-exit обязателен |
| Triage pass | **~80k** | Оценка PR+CI |
| Fix attempt (L2) | **~250k** | Worktree + minimal-fix + verifier |
| Дневной кап | **~2M** | |

**Механика early-exit** (из `loop-budget`): прогон стартует с дешёвой проверки «есть ли actionable?» → если нет,
выход **<5k токенов без спавна суб-агентов**. То есть **дорогие суб-агенты спавнятся ТОЛЬКО после того, как
дешёвый триаж нашёл работу**. Пороги 80% (→report-only) и 100% (→exit) — ступенчатый тормоз.

**🔴 [П]:** это «экономика как данные + дешёвый предфильтр перед дорогим действием». В brain — механизм M-12
(бюджет-сторож): агент читает `costPolicy` + считает 24ч-расход из журнала → решает уровень (full/report-only/exit).
Числа (3k/80k/250k/2M/80%/100%/5k) = **данные паттерна**, не код. Это питает нашу ценность «экономия токенов».

---

## 6. Безопасность (полный слой из docs/safety.md + SECURITY + AGENTS)

Куда богаче старой выжимки. Разложение:

### 6.1 Path denylist (авто-правка запрещена)
Глобы: `.env, .env.*, **/secrets/**, **/credentials/**, **/*_key*, **/*_secret*, .terraform/**,
k8s/production/**, **/migrations/** (кроме migration-loop), auth/**, payments/**, billing/**`.
Enforcement: «зашить в skill как *Do not modify denylist files. Escalate to human with context.*»
**[П]:** denylist = **данные-политика** (набор паттернов-путей), не код. В brain = policy-узел `denyList`
на scope; агент-guardrail (M-11) читает его ПЕРЕД edit.

### 6.2 Auto-merge policy (allowlist)
Дефолт: **no auto-merge без документированного allowlist**. Разрешено: правка комментов/доков-опечаток, lint-фиксы
(**только в тест-файлах**), реордер импортов, конфиг в allowlisted `docs/`. Запрещено: поведенческие изменения,
бампы зависимостей, lockfile, любой denylist-путь. Требование: allowlist записан в `AGENTS.md`/`loop-auto-merge-allowlist.md`.
**🔴 [П]:** allowlist/denylist = **пара policy-узлов**, необратимое действие (merge) идёт через них + human-gate.

### 6.3 MCP connector scopes (least privilege) — «read+comment пока не доверяют»
| Сервис | Read | Write |
|---|---|---|
| GitHub | Issues, PRs, checks | Comments, labels (**no default merge**) |
| Linear | Team issues | Status/comments (**no deletions**) |
| Slack | Channel history | **только** `#loop-escalations` |
| Database | None | **No production writes from loops** |
Реализация: **отдельные bot-аккаунты с минимальными OAuth-scopes**.
**[П]:** это **градация write-прав по внешнему коннектору** = наша модель «клапан доверия на внешние необратимые
действия». В brain это ложится на RBAC/ABAC (M-05): connector = principal с ограниченным grant; write в необратимое
= через human-gate. Идея «read+comment сначала, write после доверия» = **фазность прав, растёт с L1→L2→L3**.

### 6.4 Обязательные human-gates
Человек нужен при: изменениях security/auth/authz; payment/billing/PII; infra/Terraform/K8s-prod; апгрейдах
зависимостей (supply-chain); **изменениях >10 файлов (порог настраиваемый)**; **третьей подряд неудаче на задаче**.
**🔴 [П]:** пороги (`>10 files`, `3rd failure`) = **policy-поля**, не константы. «3rd consecutive failure» —
это стык human-gate ↔ circuit-breaker (одна метрика из журнала, два потребителя).

### 6.5 Circuit breaker protocol (инцидент-процедура, 4 шага)
Если петля вмержила проблемный код: (1) немедленно пауза ВСЕХ петель (удалить через `scheduler_list`);
(2) revert мержа; (3) документировать инцидент в state + `stories/`; (4) ужесточить verifier / сузить scope
перед возобновлением.
**[П]:** breaker — не только «стоп по счётчику», но и **процедура восстановления** (revert + документирование +
ужесточение). В brain: breaker = read-time проекция журнала (счётчик), НО «tighten verifier» = **policy-узел
можно менять данными** → петля буквально самоужесточается правкой policy, не кода. 🔴 заложить, что breaker
пишет инцидент-Observation в журнал.

### 6.6 Kill-switch
Флаг `loop-pause-all` (label или строка в STATE). Читается **и `loop-constraints`, и `loop-budget` на старте** →
мгновенный выход. **🔴 [П]:** это глобальный узел-флаг, читаемый всеми петлями до действия = M-10.

### 6.7 Прочее
Secrets: не класть ключи в промпт-планировщика, редактить из CI-логов до записи в state, не хранить в
committed state. Test/flake safety: запрет отключать тесты ради зелёного CI, root-cause до увеличения таймаутов,
эскалация флейка с тикетом. Pre-flight checklist L3: denylist в skills / auto-merge off или allowlist /
MCP-scopes проверены / human-gate правила явны / kill-switch задокументирован.
Runtime enforcement: машинно-читаемый `loop-constraints.md`, skill `loop-constraints` применяет всё на старте.

---

## 7. Failure modes (каталог из 10 — docs/failure-modes.md)

| # | Режим | Суть | Митигация (ключевая) | Перенос в brain |
|---|---|---|---|---|
| 1 | **Infinite Fix Loop** | фикс ретраит 5+ без сходимости | «Hard cap 3 → escalate», отдельный verifier-модель, карантин флейков | breakerPolicy + attempt-счётчик из журнала |
| 2 | **State Rot** | state ссылается на закрытые PR/тикеты | «Prune closed/merged every run», сверка с live API, 1 state-файл на паттерн | метаболизм M-G1 + bitemporal (устаревание) |
| 3 | **Verifier Theater** | verifier аппрувит, а потом CI падает | verifier ОБЯЗАН гонять тесты и предъявить output; сильнее модель | evidence в `verified-by`-ребре |
| 4 | **Notification Fatigue** | пинги каждые пару минут → игнор | алерт только при нужде человека; digest-режим | humanGatePolicy + кокпит-дайджест |
| 5 | **Token Burn** | дорогие цепочки на пустых данных | лёгкий триаж до спавна; early-exit; дневной бюджет | M-12 бюджет-сторож |
| 6 | **Over-Reach** | правит несвязанные модули/архитектуру | allow/deny-листы; «smallest possible diff»; триаж только сигналит | denyList + scope-validation verifier |
| 7 | **Comprehension Debt** | скорость растёт, понимание падает | human-review нетривиального; weekly digest; auto-merge только тривиальное | метка «comprehension debt» + human-gate |
| 8 | **Cognitive Surrender** | команда перестаёт оценивать качество | human-gate в КАЖДОМ паттерне; метрика «time saved *с* held quality bar» | инвариант human_gates≥1 |
| 9 | **Parallel Collision** | суб-агенты правят один файл → конфликт | «isolation: worktree для всех code-editing суб-агентов»; локи/очереди в state | worktree-residency (M-G4) + branch-lock (M-14) |
| 10 | **Escalation Failure** | ретраит вечно, не зовёт человека | прямые уведомления; видимая escalation-очередь; алерт если pending >24ч | escalation-Observation + кокпит |

**[П]:** этот каталог = **готовый список рисков brain-петель**. Каждый режим → механизм-ответ (правый столбец).
Особо: №2 State Rot и №7 Comprehension Debt — это **эпистемические болезни памяти**, а не только петель; их
лечит метаболизм/freshness M-G1. **[С]:** привязки к PR/CI — их домен.

---

## 8. Anti-patterns (каталог из 10 — docs/anti-patterns.md)

Компактно (проблема → решение), с меткой переноса:
1. **Same agent implements & verifies** → отдельный verifier, дефолт REJECT. 🔴 [П] — наш инвариант.
2. **No attempt cap** → hard limit (3) → escalate с полным контекстом в state. [П] breaker.
3. **Vague triage output** → структурированный md, one-line items + явный `Suggested loop action`. [П] triage пишет структуру, не прозу.
4. **L3 before L1 quality** → начни с read-only, измерь точность триажа до авто-изменений. 🔴 [П] `week_one_mode`.
5. **Shared state without schema** → один state-файл на паттерн ИЛИ чётко разделённые секции с prune-правилами. 🔴 [П] — про схему журнала.
6. **MCP write-everything** → L1 read-only, расширять scope после доверия. [П] фазность прав (M-05/6.3).
7. **No kill switch** → задокументировать pause/kill в LOOP.md+budget. [П] M-10.
8. **Fixing flakes with code** → классифицировать → карантин/retry, не менять код. [П] policy-классификация.
9. **Auto-merge without allowlist** → явный allowlist; human-merge для denylist. 🔴 [П] M-03/6.2.
10. **No run log** → аппендить в `loop-run-log.md`. 🔴 [П] — журнал обязателен.

**Пересечение с нашими решениями:** anti-patterns 1,4,5,9,10 = **прямые подтверждения инвариантов M-P3**
(verifier-гейт, фазность, схема журнала, allowlist, append-only лог). Ничего не противоречит — усиливает.

---

## 9. Multi-loop коллизии (docs/multi-loop.md)

**Приоритетная цепочка** (при конфликте):
1. **CI Sweeper** («Red main blocks everything») → 2. **PR Babysitter** → 3. **Dependency Sweeper** (пауза если CI красный)
→ 4. **Post-Merge Cleanup** → 5. **Daily Triage** (только отчёт; расписывает остальных).

**Правило владения:** «at most one loop may mutate a branch per hour». Каждая action-петля метит цель полем
`acting_on: branch-or-pr-id` в СВО�ём state-файле.
**Протокол детекции коллизии:** (1) прочитать ВСЕ pattern-state-файлы до действия; (2) если чужой `acting_on`
== твоя цель → skip + лог в `loop-run-log.md`; (3) неоднозначность → в секцию «Human Inbox (ambiguous /
cross-loop)» в STATE.
**Shared state:** STATE.md (приоритеты+решения человека) + per-pattern файлы (`pr-babysitter-state.md`, …) +
общий denylist + append-only `loop-run-log.md`.
**Локи через расписание:** разнос каденций (CI 15m, PR 10m «skip если CI Sweeper на том же PR», Dep 6h) заменяет
явные локи «temporal + logical separation».

**🔴 [П] важное для brain:** здесь появляется **распределённая конкуренция за ресурс (ветку/узел)**. Перенос:
- `acting_on` = **claim-ребро/поле** «эта петля держит этот узел» (мягкий лок). Механизм M-14.
- Приоритетная цепочка = **policy-поле `priority` на паттерне** (данные, не хардкод порядка).
- «Human Inbox (ambiguous)» = проекция журнала «что требует человека при пересечении петель».
- «at most one loop per branch per hour» = **rate/ownership-policy** на резиденции (M-G4).
**[С]:** конкретные петли (CI/PR/Dep) — их домен; переносим МЕХАНИЗМ конкуренции, не список.

---

## 10. Primitives matrix + concepts (что ещё вытащили)

- **6–7 примитивов** (`docs/primitives-matrix.md`): Scheduling · **Run-until-done (`/goal`)** · Worktrees ·
  Skills (`SKILL.md`) · Plugins&Connectors (MCP) · Sub-agents (maker/checker) · State/Memory (STATE/HEARTBEAT).
  Новое: **«Run-until-done» = отдельный примитив** — «persistent objective across turns» (у нас это = задача
  с `goal`, живущая между сессиями; goal-audit сторожит дрейф от цели).
- **Tool-agnostic принцип** (AGENTS.md): «Patterns and starters must stay tool-agnostic in intent; tool-specific
  paths live under examples/». **[П]:** ровно наш «pattern = данные, реализация — плагин»; brain хранит
  абстрактный паттерн, конкретный харнесс (`tools[]`) = ребро к AgentSlot.
- **Agent harness** (concepts) = «environment (tools, context, permissions) одного агента» = наш AgentSlot/Session (M-G2).
- **HEARTBEAT.md** мелькает как альтернативный state-стор → в brain не нужен отдельный файл, всё в журнале.

---

## 11. Сводка «что переносим / что оставляем им»

**Переносим в brain ([П], несущее):**
- registry-схема как **паспорт `pattern`** (все поля §2), `human_gates≥1` как инвариант.
- 4 skill-контракта как **policy/procedure-узлы над общим журналом** (triage/verifier/constraints/budget).
- 3-значный вердикт verifier + дефолт REJECT + evidence-обязательность.
- STATE = проекция; **loop-run-log (8 полей JSON) = append-only журнал** = единственная истина.
- Cost-модель с числами как **данные**; early-exit «дешёвый предфильтр до дорогого спавна».
- Denylist/allowlist/MCP-scopes/human-gate-пороги/kill-switch/breaker-процедура — всё **policy-данные**.
- Failure-modes (10) и anti-patterns (10) — **готовый каталог рисков** для brain-петель.
- Multi-loop: `acting_on`-claim, priority-policy, «Human Inbox», ownership-rate.

**Оставляем им ([С], специфика GitHub-воркфлоу):**
- npm-CLI (`loop-init/audit/cost/sync/context/mcp-server/worktree`, `goal-audit`) — под их GitHub Actions.
- 7 конкретных паттернов (PR/CI/Dep/Changelog/…) — их домен; берём МЕХАНИЗМ, не список.
- `tools`-enum, `starter`-киты, `.github/workflows/*`, привязки к PR/CI/Linear/Slack.

**Слабые места / где НЕ повторять их путь (death-by-design у них):**
- **State как markdown-файлы, перезаписываемые агентом** → у них риск State Rot (№2) и «Shared State without
  Schema» (anti-pattern 5) — они это САМИ признают. Brain уходит от этого: append-only журнал + read-time
  проекции + bitemporal, а не перезапись .md. Это наше **преимущество**, не отставание.
- **Per-pattern state-файлы + чтение «всех файлов до действия»** для детекции коллизий — не масштабируется;
  в графе это дешёвый claim-запрос, а не «прочитать N файлов».
- **Локи через разнос каденций** — хрупко (гонки на границах окон); в brain лучше явный мягкий claim (M-14).
</content>
</invoke>
