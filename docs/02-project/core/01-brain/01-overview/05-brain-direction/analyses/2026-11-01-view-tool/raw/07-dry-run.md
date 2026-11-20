---
title: Пробный прогон — документы FF и rentacar как записи-адреса в ff-brain
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-01
related: ../SYNTHESIS.md · 07-dry-run/ff.json · 07-dry-run/rentacar.json · ../../../ideas/2026-10-31-rentacar-knowledge-first-live-case.idea.md
---
Потребитель: лид + строитель шага «занести доки в память». Поглощает: ничего. В память ничего не записано.

Скрипт: `tools/brain-ingest/dry-run-docs.mjs <docsRoot> <scope> --out …` (без зависимостей, только чтение; пропускает `_log/ _logs/ _archived/ node_modules .gateway .git` и файлы с секретными именами). Rentacar = `/Users/mac16/Documents/IT/Apps/PROJETS/RENTACAR_EXCEL_ANALYTICS/docs`. В реестре проектов его нет, путь взят из `docs/03-projects/ga-rentacar/INDEX.md`.

## Цифры

| | FF | rentacar |
|---|---|---|
| Единиц (.md + .concept.json) | **1448** (15,3 МБ) | **792** (6,4 МБ) |
| Папок-узлов | 580 | 154 |
| С frontmatter / с датой / с owner | 983 / 1365 / 1219 | 55 / 400 / 228 |
| Статус: open · active · done · cold · нет | 1075 · 157 · 27 · 23 · 166 | 214 · 86 · 109 · 18 · 365 |
| Рёбра-ссылки (md-ссылки + related) | 2651 | 566 |
| Упоминания путей в `` ` `` | 1172 | 539 |
| Битые ссылки | **472** | 68 |
| Сироты (без связей) | 195 | 125 |
| Заголовок > 60 знаков | 697 | 55 |
| source.ref не проходит шаблон | 10 | 16 (`old (deprecated)/`, кириллица) |
| Одинаковое содержимое (hash) | 1 | 4 |

Виды FF (59 сырых меток → 22): analysis 309 · navigator 306 · note 212 · question 136 · raw 88 · idea 71 · synthesis 54 · design 53 · decision+adr 54. Rentacar: plan **547** (69%) · navigator 66 · design 36 · research 25.
Хабы: FF `L0-memory-unit.md` (56 входящих), `00-kernel/invariants.md` (54); rentacar `plan/domains/investor-platform/_INDEX.md` (47). Полные списки в JSON.

## ПДн-скан (только счётчики, значения не выводились)
- **FF:** email владельца 1147 (в 1131 файле, это поле owner) · похоже на ID ≥9 цифр 88 (31 файл; Telegram-id чатов и топиков) · IPv4 37 (7) · телефоны 4 (2) · похоже на секрет 1 (1 файл red-team-анализа, проверить руками) · ФИО рядом с «клиент/водитель» 0.
- **rentacar:** чужие email **10 (5 файлов)** · ID ≥9 цифр 61 (30, в том числе `docs/DATA-MODELS.md` и discovery-аудиты) · IPv4 6 (4; IP сервера в deploy) · телефоны 3 (3) · ФИО рядом с ролью 1 (`docs/plan/domains/orders-vehicles-tasks/03-customer.md`).
- Адрес тело не несёт, поэтому ПДн из тела в память не попадут. Риск в **label и путях**: их надо прогонять тем же сканом.

## Предлагаемая карта типов
В ff-brain сейчас (`packages/brain/src/domain/genesis.ts`, `sys-types.ts`): `task · decision · note · person · day · friction · scope · raw` + `sys:*`. Типа «документ-адрес» **нет**. `source {kind:file, ref, hash}` у записи есть, но без своего типа это `note` с пустым текстом, и find не отличит документ от заметки.
- **Новый `u:doc@1`**: `kind` (enum из 22 нормализованных видов) · `status` (open/active/done/cold) · `doc_status` (сырой статус, ≤40 знаков) · `date` · `pii:none`. Тело не хранится, адрес в `source`.
- **Связи**: md-ссылка → новый предикат `u:refs` (many). Существующие `derived-from`/`informed` по смыслу уже. ADR/decision-доки → `u:doc` плюс, при желании, отдельный `decision` с `derived-from`.
- **Не заносить**: raw/council/dialogue (88) и handoff/trace (6 в FF, 10 в rentacar). По уставу (п.8) это сырьё и логи. Навигаторы (306 и 66) под вопросом: это ВИДЫ, а не знание.

## Блокеры
1. Нет типа `u:doc` и предиката `u:refs`: нужен SPEC, затем `planDefinition` (по ff-brain-build).
2. Объём против устава: 1448 + 792 записей при «≤3 record за ход» превращаются в ~750 ходов. Агентский путь не подходит.
3. Нет пути массовой записи: CLI `ff-brain` умеет только `health/stats/export`. Сервис режет 60 записей/мин на диалог: ~2200 записей ≈ 37 мин, ~3400 рёбер ≈ ещё 57 мин.
4. 26 путей не проходят `PATTERNS.sourceRef`. Плюс два репозитория: нужен префикс репо (`ff:docs/…`, `rentacar:docs/…`), двоеточие шаблон допускает.
5. Label: 697 заголовков FF длиннее 60 знаков. Нужна обрезка или ручной label.
6. Граф грязный: 472 битых ссылки в FF. Чинить в git до заноса, иначе получим рёбра-сироты (V6).
7. Стирания нет (V7, hard_erase не подключён). Rentacar содержит чужие email и ID. Даже адрес/label о клиенте необратим.

## Что нужно для реальной записи
- SPEC + тип `u:doc@1` и `u:refs` через `planDefinition`. Области `rentacar` нет, её заводить словом владельца.
- **Ingest-путь через сервис**, а не через агента: сервисный принципал (по образцу `sys:gateway`) + команда `ff-brain ingest-docs` с rate-окном для батча.
- **Идемпотентность**: ключ `scope + source.ref`. Тот же hash → 0 актов. Другой hash → update того же id, без дубля.
- **Обратимость**: перед заносом делать бэкап (`backupEveryActs` уже есть). Все записи метить `layer`/батч-тегом, чтобы откатить батч `retract`-ом целиком. До hard_erase rentacar заносить только после ручной вычитки 40 файлов с ПДн-сигналом.
- Порядок: пилот на ~50 FF-доках из `05-brain-direction/`, проверка find/read и вида, потом остальное.

Итог: задача в плане — SPEC `u:doc` + сервисный ingest, пилот на 50 FF-доках; rentacar отложен до вычитки ПДн и решения владельца.

Вопрос-цель: ответил. Память получила бы ~1350 FF + ~780 rentacar записей-адресов и ~3200 рёбер. Мешают: нет типа doc/refs, нет массового пути (лимиты), 472 битых ссылки, 26 невалидных ref, ПДн-сигналы в 40 файлах rentacar при отсутствии стирания.
