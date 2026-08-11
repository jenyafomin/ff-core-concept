---
node_type: plan
title: "S2 — Заложить ФОРМЫ (UNIT-SPEC-v1.1) — ⚠️ провизорно до S3"
status: implemented
plan_id: S2
owner: jenya.stasik@gmail.com
date: 2026-08-08
state: ../../state.md
index: ../INDEX.md
pool: ../../_shared/task-pool.md
handoff_template: ../../_shared/HANDOFF.template.md
session_control: ../../_shared/SESSION-CONTROL.md
direction: ../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md
docket: ../../../../_log/2026-08-08-orchestrated-design-push/synthesis/SPEC-DELTA-DOCKET.md
depends_on: [S1]
unblocks: [S3]
---

# S2 — Заложить ФОРМЫ (UNIT-SPEC-v1.1)

> Позиция в цепи: **A (заложить швы).** ⚠️ **ПРОВИЗОРНО до S3** — форма `opaque-edge-id` кладётся на силе
> БУМАЖНОЙ рекомендации F6; S3 — её первая реальная фальсификация. F6 уже раз перевернулся в этом прогоне →
> держать шов помеченным `provisional`, финализировать после S3. Мы pre-prod → неверная форма ещё чинится
> до отсечки G1. (DIRECTION §3 · SPEC-DELTA-DOCKET.)

## entry-branch
**A · применить retrofit-НЕВОЗМОЖНЫЕ дельты формы** к UNIT-SPEC (одна ветка). НЕ строить enforcement-логику
(Закон-1: заложить форму, не политику).

## carried-concepts
- **ЗАКОН-1** в деле: структурная интерпозиция/идентичность СЕЙЧАС, политика потом.
- Дельты (SPEC-DELTA-DOCKET, класс retrofit-невозможный): **deref-seam funnel** (§6/F1, берёт viewer) ·
  **opaque edge-identity** (§4/F6, замороженная форма `Edge`) · **admission-гейт форма** (§4/F2 — присутствие гейта+хук; fail-open/closed+классы = R4, решено в S1) ·
  **§9 три-полки честность** (retrofit-дешёвая, но заносим тут).
- G-условие: закрывает **G1** (формы заложены), готовит **G3** (честность §9).

## gate (DoD — уточнить на входе)
- UNIT-SPEC-v1.1: все 3 retrofit-невозможные дельты формы применены, помечены `provisional` (до S3).
- §9 три-полки честность внесена (0 canon-lie в затронутых §).
- Гейт критика: форма не тащит enforcement-логику (Закон-1 чистота); opaque-edge-id помечен «ждёт S3».
- ⚠️ финализация формы — НЕ здесь; S2 закрывается с провизорной меткой.

## team-rules (скелет — доразвернуть на входе)
- **Читать холодным стартом:** этот README · S1-ратификация (законы) · `SPEC-DELTA-DOCKET.md` (§4/§6/§9) ·
  UNIT-SPEC (`docs/02-project/core/01-brain/03-unit/`).
- **Кто критик:** отдельный `critic` — проверяет Закон-1 чистоту (форма ≠ политика) + отсутствие canon-lie.
- **Агенты/линзы:** `system-architect` (дизайн дельт формы) + `builder` (правка UNIT-SPEC как спеки, не кода) → `critic`.
- **Формат выхода:** дельты в UNIT-SPEC + отчёт критика; хендоф по шаблону.
- **Синхронные волны под шлюзом** (≤3-6, `run_in_background:false`).

## carried-concepts → handoff-contract
Контракт сессии: **`../../_shared/SESSION-CONTROL.md`**. Батон: `../../_shared/HANDOFF.template.md`.
Задачи → `../../_shared/task-pool.md` (существующие: `T-D1b-*` §9-дельты уже засеяны).

## entry-condition / что разблокирует
- **Вход:** `blocked-by S1` — нужны ратифицированные 2 закона (иначе дельты не выводятся механически).
- **Разблокирует:** **S3** (доказать ставку) — S3 фальсифицирует провизорную форму opaque-edge-id.
