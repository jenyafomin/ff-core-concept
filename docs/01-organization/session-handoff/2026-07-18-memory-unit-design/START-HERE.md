---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-18
Scope: project
node_type: handoff
title: START HERE — что делать дальше (action-first)
---

# 🚀 START HERE — свежая сессия (FF память)

> Веди к действию, не пересказывай историю. Контекст — по ссылкам внизу, читать ТОЛЬКО если нужно.
> Всё пока лежит в `…/01-model/01-node/` — **и это временно, см. FIX-0.**

## ⛳ ДЕЛАЙ СЕЙЧАС (по порядку)

### FIX-0 · Разнести `unit/` по правильным домам (link-aware) — ПЕРВЫМ
`unit` — плохое имя и свалка: смешаны модель-суть и процесс. Разнести:
- **Модель-суть** → `01-model/01-node/` (папка «единица/узел», свернуть карту `01-node.md`):
  `README·TREE·SYNTHESIS-unit·DECISIONS-unit·01-passport/·02-policy-block/·03-context-resolver/·
  04-variants-projections/·FABLE-*-hard-erase·FABLE-*-direction·_critique*`.
- **Процесс/сессия** → `docs/01-organization/session-handoff/2026-07-18-memory-unit/`:
  `VISION-SIMPLE·HANDOFF-2026-07-16·NEXT-STEPS·PROCESS-UPGRADE·RECOMMENDATIONS·RATIFIED-…·APPLIED-…·
  START-HERE·analyses/(разборы конвенций)`.
⚠️ Внутри файлов есть **абсолютные пути** `…/unit/…` — при переносе прогнать замену
`grep -rl "01-model/01-node" | xargs sed`-ом и перепроверить (`grep -r "01-model/01-node"` → пусто).
Пойнтер на старом месте оставить. Обновить `docs/01-organization/session-handoff/STATE.md` на новый START-HERE.

### FIX-1 · Доделать применение конвенций (остаток applier)
Спека: `analyses/RECOMMENDATIONS.md`. Через agent-builder, с бэкапом `.bak`, БЕЗ коммита:
- **doc-discipline SKILL.md** ← R1 нумерация · R2 states · R4 план/задача.
- **session-logging** ← R3 (`logs/`+`conversations/NN`+`concept.json`). ⚠️ НЕ установлен глобально —
  правь проектную копию, спроси владельца про глобальную установку.
Reverify: `grep -c 2026-07-17 ~/.claude/skills/doc-discipline/SKILL.md` → должно быть >0.

## 🧹 Мелкие фиксы (можно отдать маленькому агенту параллельно)
- Свободные `_critique*.md` в корне `unit/` → в `analyses/` (конвенция R1: плюральные контейнеры).
- В `PROCESS-UPGRADE` (старое место) добавить 1-строчный пойнтер на `01-organization/process/` (P3).
- Проверить `Related:`-ссылки на битость после FIX-0.

## 🌊 ПОТОМ — 4 волны concept-first (по методу «Волны»)
1. **Полнота примитивов** (вещь·связь·акт·линза → 5-я/6-я грань + как миксуются).
2. **АКТ** (глагол) — план папок в `NEXT-STEPS.md §1` + ADR «Акт и журнал».
3. **GitHub-модель = измерение policy-as-data** (history-mode+TTL+volume).
4. **Реестр+навигация** (`concept.json`-как-ГРАФ). Детали: `RATIFIED-and-new-concepts-2026-07-17.md`.

## 📌 Долг ратификации (одним заходом с владельцем)
DEC-4…10 · D-U1…7 · Ф1…5 · hard-erase кластер — ждут финального «да».

## 📖 Контекст (читать только при необходимости)
`VISION-SIMPLE` → `HANDOFF-2026-07-16` → `SYNTHESIS-unit`+`DECISIONS-unit` →
`RECOMMENDATIONS`+`RATIFIED-…` → `APPLIED-2026-07-18.md` (точный статус).
</content>
