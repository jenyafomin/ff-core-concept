# RAW — Мульти-критика граней, ВОЛНА 1 (4 критика) · 2026-06-19
> Метод владельца (msg 193): несколько критиков, каждый фиксирует ВСЕ сомнения, потом перекрёст + пересмотр своих.
> Тестируемое: 11 граней из `UNIVERSAL-NODE-2026-06-16-canvas.md`. Condensed-faithful.

## Критик 1 — РЕДУНДАНТНОСТЬ (минимализм)
- [D1] Trust+Provenance = одна грань `Credibility` (ко-зависимы) · высокая · ядро 7→6.
- [D2] Belonging+Scope дублируют контекст → `Context` · средняя · 7→6.
- [D3] **Reactivity — не грань ноды, а слой движка** · высокая · 11→10.
- [D4] Branches = частный случай Relation (`branch-of`+active) · средняя · 11→10.
- [D5] **Workflow в списке граней нарушает принцип** (ИИ не знает тип → не интерпретирует state) · высокая.
- [D6] Temporal толстая (record/event/validity) — слабо · низкая.
- [D7] Identity.заголовок лишний в ядре (→Payload/UI) · средняя.
- [D8] Freshness/хеш — пропущена нужда ИИ · средняя.
- [D9] Само «11» — не дедукция, а «2 агента сошлись» (общий blind spot); надо начинать с минимума и доказывать добавление · средняя.
- (A) Минимум: бесспорное ядро 4 (Identity[id+type], Relation, Temporal[created+valid], Trust/Credibility[epistemic+valve+source]) + спорные 3 (Scope, Belonging, Provenance). Исключить: Workflow→payload, Reactivity→движок, Branches→ребро. Итог 4-6.
- (C) Trust=1 (epistemic+valve = «разрешение действовать»); Provenance влить в Trust; Belonging?Scope под вопросом; Freshness=поле внутри Temporal не ось; границу ядро/модуль провести строже (Workflow/Branches/Reactivity не проходят).

## Критик 2 — ПОЛНОТА (пропуски)
- [D1] **Freshness/Staleness** (`freshness_policy`+`stale`) — высокая — ядро (Temporal не покрывает хеш-инвалидацию/decay).
- [D2] **Identity-merge/Dedup** (`canonical_id`,`aliases[]`) — высокая — ядро (не Provenance, не Relation; «это та же сущность»).
- [D3] **Sensitivity/Access** (`private|internal|shareable|public`, каскад MAX) — высокая — ядро (Scope=«где», Trust=«верить», Sensitivity=«кому показывать»).
- [D4] **Importance/Priority** — высокая — потеряна при рефрейме (есть в коде `packages/core`, в STATE.md), «растворена» в Belonging; нужно явное поле.
- [D5] Reply/Thread — НЕ отдельная (покрыто Relation).
- [D6] Localization — нет (низкая).
- [D7] Confidence-степень — sub-field Trust (средняя).
- [D8] Modality (текст/файл/медиа) — sub-field Identity через тип (средняя).
- [D9] Archived/Retention (`archived:bool`+`expires_at`) — средняя — ядро минимум.
- (A) Недостающие (ранг): 1 Sensitivity, 2 Dedup, 3 Importance, 4 Freshness, 5 Archived, 6 Confidence(sub), 7 Modality(sub).
- (C) Freshness=да (мин: stale+policy); Dedup=да (отдельная ось); CRITICAL: принцип паспорта нарушается трижды — без Sensitivity/Dedup/Importance агент вынужден вскрывать payload.

## Критик 3 — ГРАНИЦА ядро/движок/модуль (строгий тест)
- [D1] **Relation — в ЯДРЕ ошибочно → ENGINE** (рёбра между нодами = механика движка/adjacency; в ноде max `home`) · высокая.
- [D2] **Scope — грань-призрак** (namespace=часть Identity, project_area=часть Belonging, principal=ENGINE/ABAC) · высокая.
- [D3] Temporal частично: ядро=created/updated; occurred/valid=MODULE (типо-зависимы, у trace/предиката их нет); supersedes=ENGINE-ребро · средняя.
- [D4] Trust: epistemic=ЯДРО; valve=политика ENGINE (в ноде нет поля «valve», нода говорит «я proposal», движок решает) · средняя.
- [D5] Provenance сомнительно: source→ядро?, actor→ENGINE(created_by), trace→ENGINE-ребро · низкая.
- [D6] Branches → полностью ENGINE; в паспорте max `branch_name` в Identity · высокая.
- [D7] Belonging: ядро только `home_id`; cascade→ENGINE; overlap Scope · средняя.
- [D8] Identity: ядро id+type_id; version→ENGINE (версия СХЕМЫ живёт в type-ноде, не в каждой ноде); title→минимальный payload · средняя.
- [D9/10/11] Payload/Workflow=MODULE верно; Reactivity=не грань (ENGINE/MODULE) верно · высокая.
- (B) Топ-3 неверных: Relation в core; Scope как грань; Temporal целиком в core.
- (C) **Строгому тесту проходят 3-4 грани:** id, type_id, home_id, epistemic, created/updated, (source?). Заявленные 7 ядра реально содержат ENGINE-механику и MODULE-семантику → ядро раздуто ~вдвое.

## Критик 4 — ОРТОГОНАЛЬНОСТЬ (смешения)
- [D1] **Trust = ДВЕ оси: Epistemic (истинно) ⟂ Valve/Authorization (санкция на действие)** · ВЫСОКАЯ. Контрпример: epistemic:fact + valve:pending-approval. Это ВТОРОЕ расщепление уровня epistemic⟂state.
- [D2] Provenance частично ВХОДИТ в Trust (источник→доверие) — не ортогональны · средняя; правило: Provenance=факты (не суждения), Epistemic=явная оценка (не авто-вывод).
- [D3] Belonging vs Scope — граница стёрта · средняя; тест: можно ли один Belonging с двумя Scope? да→разные оси.
- [D4] Identity = id ⟂ тип@версия (разная частота изменений); заголовок — не ось · средняя.
- [D5] Temporal: record-time ⟂ event-time ⟂ validity-time (bi/tri-temporal); **supersedes → Relation-ребро** · высокая (supersedes).
- [D6] Workflow(state) vs epistemic — терминологическая близость draft/open → переименовать draft→unverified · низкая.
- [D7] Reactivity — слой, не грань; в паспорте max флаг `has_reactive_rules` · высокая.
- (C) **Trust = 2 оси** (epistemic ⟂ valve). Ещё скрытое расщепление: Temporal (record/event/validity). Кандидат: Identity (id ⟂ тип).

## Предв. конвергенции (для волны 2)
1. **Reactivity — не грань ноды** (C1,C3,C4). 2. **Trust смешивает epistemic+valve** (C3,C4 — развести; C1 — против). 3. **Relation/Branches — механика движка, не грань** (C3; C1 Branches→ребро). 4. **Scope — призрак/декомпозируется** (C1,C3). 5. **Temporal: supersedes→Relation; split времён** (C3,C4). 6. **Пропуски-кандидаты в ядро: Sensitivity, Dedup, Importance, Freshness** (C2; C1 freshness). 7. **Provenance↔Trust**: слить (C1) vs развести правилом (C4) vs частично движок (C3). 8. **Размер ядра**: минимум 3-5 (C3), 4-6 (C1) vs +4 от полноты (C2).
