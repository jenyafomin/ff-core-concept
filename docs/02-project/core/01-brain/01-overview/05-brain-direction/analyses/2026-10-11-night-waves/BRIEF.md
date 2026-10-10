# BRIEF ночной оркестрации 2026-10-11 — читать КАЖДОМУ агенту первым
- **Status:** active · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** все агенты волн w1–w6 · **Поглощает:** — (наказ владельца голосом 2026-10-10 ночь)

## Наказ владельца (суть голосового)
Владелец спит; завтра сам запускает память (кит готов: `docs/_log/2026-10-05-personal-memory-launch/launch/RUNBOOK.md`).
Ночью — «полноценно доработать и развить» направление ПАМЯТЬ + ШЛЮЗ (agents-manager) под уже обговорённым вектором:
- идеи · критика · анализ · наблюдения · разные видения;
- **сначала абстрактно — вопросы, потом направления**; что-то ляжет на конкретный проект, что-то на память, что-то на шлюз;
- искать идеи от **проблем, которые возникают** (живой опыт, инциденты), и от **концептуальных вопросов**;
- линзы: loop-engineering (agents-manager `docs/_logs/2026-10-04-loop-engineering-review/`), компаунд-инжиниринг;
- **очень важно: правильная ПОСЛЕДОВАТЕЛЬНОСТЬ вопросов** и затем — как правильно запускать агентов (какие пункты им вставить),
  потому что на старте легко пойти не туда; спорным моментам — отдельное внимание;
- всё исходит из **целей и 7 ценностей** (`docs/02-project/core/01-brain/01-overview/01-values/_CARDS-2026-07-08.md`).
- Финал: `concept.json`-визард для владельца (вопросы в правильном порядке; старые варианты рядом с новыми).

## Откуда стартуем (читать по нужде, не всё)
- КОМПАС: `docs/02-project/core/01-brain/01-overview/05-brain-direction/OVERVIEW.md` (цель, наказ, ADR-0016/0017, лестница).
- Зёрна владельца + решения 2026-10-10: `.../05-brain-direction/ideas/2026-10-10-owner-seeds-live-use.idea.md` (п.1–11).
- Проверка запуска: `docs/_log/2026-10-05-personal-memory-launch/prelaunch-review/SYNTHESIS.md` (+ critic.analysis.md).
- Кит запуска: `docs/_log/2026-10-05-personal-memory-launch/launch/` (RUNBOOK, PROMPT-memory-protocol, GATE-7days).
- План v2: `docs/_log/2026-10-05-personal-memory-launch/PLAN-v2-brain.md`. F6 «кухня шлюза → память» R1–R6:
  `docs/02-project/core/01-brain/02-infrastructure/04-modules/M-G3-type-registry-policy/analyses/2026-10-09-plugins-and-system-types/f6/SYNTHESIS-f6.md`.
- Метод: `.claude/rules/recursive-orchestration-method.md` (8 законов, банк вопросов по ценностям V1–V7).
- Шлюз: `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager` (живой бот! ветка `feat/phase-0-unblock` @`f24d0f4`, R1 влит).
- Проекты владельца: `~/.claude/registry/projects.json`, `docs/03-projects/` (7days, cardex, dwizh, ga-rentacar, video-social-music).
- Креатив-леджер: `docs/_log/creative-ledger.jsonl` (зёрна прошлых сессий).

## Жёсткие правила
1. **Фаза DESIGN: код НЕ трогаем** (ни FF, ни шлюз). Только документы в выделенной папке своей волны.
2. **Никаких Bash-команд с литералом пути папки памяти** (`~/.ff-brain`, `/Users/mac16/.ff-brain`) — стоп-лист; не обходить.
3. Не читать `.env`, ключи, секреты. Не git-коммитить (это делает лид).
4. Факты — с якорем `file:line`; догадка помечается «гипотеза».
5. Выход — В ФАЙЛ (Write) в папку, указанную в задаче; шапка: Status/Owner jenya.stasik@gmail.com/Date/Потребитель/Поглощает;
   последняя строка `Итог:`. Лиду возвращать ≤200 слов выжимки (не дамп).
6. Язык документов — русский, просто и коротко; полные пути.
