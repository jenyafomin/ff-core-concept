---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: DOC-SWEEP — аудит «грязных мест» дерева и план переселения (DESCRIBE-only, без «строй»)
scope: Project (FF-Personal-Management) · ветка refactor-tree · фаза DESIGN
related:
  - ../../../../../../../.claude/rules/doc-tree.md            # несокращаемые законы размещения
  - ../../../../../../.doc-types.json                          # реестр тип→дом (homeRule)
  - ../../../../../../INDEX.md                                 # живая карта
  - ../../../../../../_log/2026-08-12-isolation-model-and-seam-freeze/HANDOFF.md  # §🗂 известный долг
lens: doc-discipline audit (3 архетипа папок · .{type}.md · trace≠knowledge · один дом · нет loose-файлов)
note: >
  DESCRIBE-only. Ни один файл на диске НЕ перемещён/переименован/удалён. Все переезды описаны как
  обратимые git mv, к исполнению ТОЛЬКО по явному «строй» владельца. Все затронутые пути git-tracked →
  любой mv откатывается `git mv` назад или `git checkout`.
---

# DOC-SWEEP — план переселения (owner-eye, 2026-08-12)

> Аудит по `git status` + известному долгу (HANDOFF §🗂). Каждая строка:
> `текущий путь → предлагаемый дом → суффикс ок? → закон → обратимо? → needs-home?`
> Ранжировано по тяжести: mis-homed кластеры первыми, косметика суффиксов — в конце.
> **НИЧЕГО не двигал.** Пути сокращены от корня репо (`docs/…`). Топик-корень =
> `docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/` (далее `TOPIC/`).

## Сводка тяжести
- **P1 (mis-homed / superseded staging с готовым содержимым):** 2 кластера — `council/raw/2026-08-11-*` (10 файлов) и `_inbox/` (108 tracked файлов, README=superseded).
- **P2 (структурные: нет навигатора топика, дубли волн, ненумерованные узлы):** 4 пункта.
- **P3 (косметика: незарегистрированные суффиксы, ненумерованные D-NNN, .spec.md в decisions/):** 3 пункта.
- **Корректно размещено — НЕ трогать:** 5 пунктов (см. низ).
- Всего «грязных» пунктов, требующих действия: **9** (2×P1, 4×P2, 3×P3).

---

## P1 — mis-homed / superseded staging (двигать первыми)

### P1-A · council/raw/2026-08-11-next-step-strategy/ → TOPIC (истина уже синтезирована в топик)
Известный долг (HANDOFF §🗂). **10 tracked файлов** сырья волны, чей синтез УЖЕ лёг в `TOPIC/design/` (01-04)
и `TOPIC/analyses/`. `council/raw/` — легитимный raw-стейджинг (CLAUDE.md), но эта партия ОТРАБОТАНА →
должна уехать из стейджинга в постоянный дом топика (или в `_log` как trace-сырьё). Закон 1 (trace≠knowledge),
закон 3 (консолидируй в дом), закон 10 (LOSE-NOTHING — со-разместить, не стирать).

| текущий (council/raw/2026-08-11-next-step-strategy/) | предлагаемый дом | суффикс ок? | закон | обратимо? | needs-home? |
|---|---|---|---|---|---|
| DESIGN-principal-auth-seam.design.md | `TOPIC/design/` (рядом с 01-seam-and-lifecycle) как датир. со-версия ИЛИ архив-by-status если поглощён | ✅ .design.md | L2/L10 | git mv ✅ | нет (дом=design/) |
| CRITIC-invariant-and-form.critic.md | `TOPIC/design/` со-версия критики к 03-values-and-threat | ⚠️ .critic.md незарег. (P3-C) | L10 | ✅ | нет |
| CRITIC-redteam.analysis.md | `TOPIC/analyses/` (redteam-разбор) | ✅ .analysis.md | L2 | ✅ | нет |
| PREMISE-CHECK-trust-bugs.analysis.md | `TOPIC/analyses/` | ✅ | L2 | ✅ | нет |
| ABSTRACTION-recheck-trust-boundary.analysis.md | `TOPIC/analyses/` | ✅ | L2 | ✅ | нет |
| AGENT-LAYER-map.analysis.md | `TOPIC/analyses/` | ✅ | L2 | ✅ | нет |
| BUILD-trust-plane-stage1.impl.md | `_log/2026-08-11-*/` (impl-trace Стадии-1, уже в git) ИЛИ `TOPIC/decisions/` рядом с ACCEPT-stage1 | ⚠️ .impl.md незарег. (P3-C) | L1 (trace) | ✅ | да, tag |
| REVIEW-trust-plane-stage1.review.md | `_log/…` (trace ревью) рядом с BUILD | ⚠️ .review.md незарег. | L1 | ✅ | да, tag |
| FABLE-strategist.advisory.md | `TOPIC/design/` (стратег-адвайзери к синтезу) | ⚠️ .advisory.md незарег. | L10 | ✅ | нет |
| SYNTHESIS-next-step.md | поглощён `TOPIC/design/04-SYNTHESIS-decision-ready.md` → архив-by-status ИЛИ со-версия | — (нет суффикса) | L8/L10 | ✅ | нет |

**Разрешение (рек):** т.к. содержимое уже синтезировано в топик, предпочтителен **LOSE-NOTHING-мердж**:
не механический git mv поверх, а (1) со-разместить датир. версии в `TOPIC/design|analyses/`, (2) агент-синтезатор+критик
сверяет — что уже поглощено помечается `status: superseded` (файл остаётся), уникальное вливается. `.impl/.review`
(trace-вещество) → в `_log`. Не «досыпать пакет поверх бардака» (закон 3).

### P1-B · docs/_inbox/ (108 tracked файлов) — СТЕЙДЖИНГ ОФИЦИАЛЬНО РАСТВОРЁН, но держит готовое
`_inbox/README.md` = **status: superseded** (решение владельца 2026-07-19: «_inbox растворён в `_log`»).
Тем не менее внутри 108 tracked файлов, включая **готовые волны**. Это прямое нарушение закона 3/7 (finished work
в упразднённом инбоксе). Наиболее срочный под-кластер:

| текущий | предлагаемый дом | закон | обратимо? |
|---|---|---|---|
| `_inbox/2026-08-04-assemble-and-direct/` (README status:active, theme=assemble-and-direct) | **дубль живого состояния** `docs/00-states/05-assemble-and-direct/` → реассембл/поглощение в дом состояния, остаток архив-by-status | L2 (один дом на тему), L8 | git mv ✅ |
| `_inbox/2026-08-04-picture-coverage/` (census+analyses+ideas+decisions, крупная волна) | дома по типу: analyses→механизм, decisions→decisions/ темы, ideas→ideas/; ИЛИ `_log` если trace | L4/L5 | ✅ |
| `_inbox/2026-07-26-kernel-ratification-unblock/`, `_inbox/1-gpt-review/`, `_inbox/2026-08-03-owner-forks-root-seal.md`, `_inbox/2026-08-04-durable-store-substrate/` | разнести по домам/`_log`; закрыть `_inbox` совсем | L1/L3 | ✅ |

**Разрешение (рек):** это ОТДЕЛЬНЫЙ прогон (108 файлов, риск линков) — НЕ мешать с активной actor-model-волной.
Завести под-задачу `needs-home: _inbox-dissolution` в task-pool. Начать с `2026-08-04-assemble-and-direct`
(прямой дубль живого состояния — самый ядовитый). Остальное — партиями, LOSE-NOTHING.

---

## P2 — структурные дефекты (после P1)

### P2-A · TOPIC/ НЕТ корневого навигатора (закон 8)
`TOPIC/` держит 7 под-веток (analyses/ decisions/ design/ ingest/ m5-surface-identity/ synthesis/ tracks/) + seed-вопрос,
но **корневого `INDEX.md` нет** (есть только `tracks/INDEX.md`). Закон 8: один навигатор на трек, `INDEX` правдивый.
→ **Создать** `TOPIC/INDEX.md` (type: overview) со статусами под-веток. Describe-only (создание по «строй»).
Обратимо: новый файл, удаляется. needs-home: нет (это и есть дом-навигатор).

### P2-B · Дубли волн: caller-reality / values-threat в двух местах (закон 10)
| файл A | файл B | вопрос |
|---|---|---|
| `TOPIC/design/02-caller-reality.analysis.md` (127 строк) | `TOPIC/m5-surface-identity/census/02-caller-reality.analysis.md` (184) | один разбор в двух домах? |
| `TOPIC/design/03-values-and-threat.critic.md` (187) | `TOPIC/m5-surface-identity/census/03-threat-and-values.critic.md` (237) | тот же |
`design/` — ранняя волна (Aug 12 01:35), `m5-surface-identity/census/` — более поздняя/глубже (Aug 12 04:57, +57/+50 строк).
Закон 2 (один дом на разбор) + закон 10 (новее побеждает как направление, ничего не стирать).
→ **Разрешение:** свести в ОДИН дом (`m5-surface-identity/census/` как более глубокий), раннюю версию пометить
`status: superseded` (не удалять) или со-разместить. Сверку делает синтезатор+критик, не голый git mv.
Обратимо ✅. needs-home: нет.

### P2-C · Ненумерованные узлы-папки (закон 1/6, R1)
| папка | проблема | предлагаемо |
|---|---|---|
| `TOPIC/m5-surface-identity/` | узел-папка без `NN-` префикса (R1) | → `TOPIC/07-m5-surface-identity/` (или встроить в нумерацию топика) |
| `TOPIC/ingest/` (1 файл F-D-sheets-ingest.design.md) | ненумерованная, неплюральная, не `_` | → `TOPIC/08-ingest/` ИЛИ, т.к. 1 финальный файл, поднять в дом ingest вне топика (F-D = отдельный продуктовый пробел) |
| `TOPIC/design/`, `TOPIC/synthesis/`, `…/census/` | имена = file-типы, ненумерованные, mixed-type волны | это «wave-папки»; либо нумеровать как узлы (`01-…`), либо признать паттерн в реестре |
Закон 1 (узел = `NN-` по смыслу), закон 6 (R1-нумерация). Обратимо ✅. needs-home: частично (ingest — да).

### P2-D · TOPIC/synthesis/ (Aug 9) возможно superseded поздним design/04-SYNTHESIS (закон 9)
`TOPIC/synthesis/01-critic-check.critic.md` + `02-resolution.synthesis.md` (Aug 9) — ранний синтез топика.
Позже появился `design/04-SYNTHESIS-decision-ready.md` (Aug 12). Проверить: поглощён ли synthesis/ ?
→ Если да — `status: superseded` во frontmatter (файл остаётся, закон 9), редирект-заглушка. Обратимо ✅.

---

## P3 — косметика (последними; флаг, не ошибка)

### P3-A · `.spec.md` в decisions/ — суффикс не на своём месте (закон 5 = сигнал переноса)
`TOPIC/decisions/F2-seed-fixtures.spec.md` (type: spec) сидит в плюрал-контейнере `decisions/`. `spec` ≠ decision.
→ либо вынести в дом спеки (рядом с движком/`m5-surface-identity/design/05-seamAuthority-reservation.spec.md`
уже есть .spec.md-собрат — там дом спек), либо кристаллизовать в decision. Флаг, не ошибка. Обратимо ✅.

### P3-B · decisions/ файлы не нумерованы D-NNN (реестр decisions homeRule)
`TOPIC/decisions/` — правильный плюрал-контейнер в своей теме (O-14, закон 2 ✅ — **дом верный, НЕ двигать**).
Но реестр требует «файлы внутри нумеруются (D-001…)». Здесь описательные префиксы (RATIFY-, FORK-decision4/5,
ACCEPT-, OWNER-FORKS-, T5-, WORKORDER-). Косметика именования; не срочно. needs-home: нет.
`WORKORDER-gateway-dup-P2.decision.md` — контент про баг чужого репо; дом-истина бага =
`docs/01-organization/process/bugs/gateway-dup/` → это work-order (указатель) ок в decisions/, но контент-истину
держать в bug-доме (там уже INDEX.md, modified). Кросс-линк, не дубль.

### P3-C · Незарегистрированные суффиксы (реестр-пробел, системное)
Используются, но НЕ в `.doc-types.json`: `.critic.md`, `.synthesis.md`, `.spec.md`, `.impl.md`, `.advisory.md`,
`.review.md`, `.census.md`, `.green-conditions.md`. Закон 5 (тип берётся из реестра). Это НЕ повод двигать 30+ файлов —
это **пробел реестра**. → Решение владельца: (а) зарегистрировать `critic/synthesis/spec/census` как проектные
file-типы (через agent-builder, R1), ИЛИ (б) маппить на существующие (critic→analysis, synthesis→analysis/decision).
До решения — оставить. needs-home: реестр, не файлы.

---

## ✅ Корректно размещено — НЕ трогать (чтобы владелец не переусердствовал)
1. `TOPIC/tracks/` — 6 узлов-папок + `INDEX.md`, `.design.md`-виды, декларированно НЕ дубль анализа
   (навигатор явно указывает дом-истину в m5/brain). Образцовая ветка. Только закоммитить.
2. `TOPIC/decisions/` как **контейнер** — верный дом (плюрал в своей теме, O-14/закон 2). Файлы внутри — их дом.
3. `TOPIC/analyses/` (01/02/03) — плюрал-контейнер, `.analysis.md` корректны.
4. `docs/02-project/core/01-brain/03-unit/01-file-unit/` — нумерованный узел в brain-дереве, верный дом (untracked=новое, просто закоммитить; можно добавить INDEX).
5. **Modified (M) файлы** — ADR-0010/0011, `state.md` (пульт владельца — НЕ трогать содержимое, doc-types state homeRule), engine `src/…`, gateway-dup/INDEX.md — правки НА МЕСТЕ, не переезды.
6. **`docs/_log/`** — gitignored TRACE, append-only указатели. Это **НЕ дефект**: две-вещества-модель (закон 1), trace ссылается на knowledge, живёт вне git намеренно. Не «чистить».

---

## Execute-later чеклист (по «строй» — обратимые git mv, НЕ исполнено)
> Порядок: P1-A (в один ход) → P2 структурные (в один ход) → P1-B `_inbox` (ОТДЕЛЬНЫЙ прогон, партиями) → P3 косметика.
> Перед любым mv: `git status --porcelain <target>` ОТДЕЛЬНОЙ командой (git-working-tree-safety). Дерево уже чистое по этим путям.

1. **P1-A** — для каждого из 10 `council/raw/2026-08-11-*`: `git mv <file> TOPIC/{design|analyses}/…`; поглощённые → `status: superseded` (правка frontmatter, не удаление); `.impl/.review` → `_log/2026-08-11-*/`. Синтезатор+критик сверяет (LOSE-NOTHING).
2. **P2-A** — создать `TOPIC/INDEX.md` (overview, статусы под-веток).
3. **P2-B** — свести дубли caller-reality/values-threat в `m5-surface-identity/census/`; ранние → `superseded`.
4. **P2-C** — `git mv TOPIC/m5-surface-identity TOPIC/07-m5-surface-identity`; `git mv TOPIC/ingest TOPIC/08-ingest` (или вынести F-D в отдельный ingest-дом).
5. **P2-D** — проверить/пометить `TOPIC/synthesis/` `superseded` если поглощён.
6. **P1-B** — ОТДЕЛЬНЫЙ прогон: начать `git mv docs/_inbox/2026-08-04-assemble-and-direct/*` → дом состояния `00-states/05-assemble-and-direct/`; далее picture-coverage и остальное партиями; финально закрыть `_inbox`.
7. **P3** — `F2-seed-fixtures.spec.md` → дом спек; (опц.) перенумеровать decisions/ в D-NNN; решить судьбу суффиксов в реестре (agent-builder).

## Seed в `_shared/task-pool.md` как needs-home
- `needs-home: council-raw-2026-08-11-rehome` — 10 файлов, LOSE-NOTHING-мердж в TOPIC (P1-A).
- `needs-home: _inbox-dissolution` — 108 tracked файлов в superseded `_inbox`; отдельный прогон партиями (P1-B).
- `needs-home: TOPIC-index` — создать корневой навигатор топика (P2-A).
- `needs-home: m5-census-dup-merge` — свести дубли caller-reality/values-threat (P2-B).
- `needs-home: F-D-sheets-ingest` — F2-seed-fixtures.spec + ingest/ дом (P3-A/P2-C).
- `registry-gap: unregistered-suffixes` — critic/synthesis/spec/impl/advisory/review/census (P3-C, agent-builder R1).
