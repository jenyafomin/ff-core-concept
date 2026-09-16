---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-09-15
Scope: project
node_type: module-deepdive
module: agent-event-ingest
Related:
  - ../README.md
  - ../M-G1-memory-engine/README.md
  - ../../../../../../architecture/ADR/ADR-0014-integration-strategy-memory-runtime.md
  - ../../../01-overview/01-values/07-soglasie/README.md
  - ../../../../../../_log/2026-09-15-autonomous-spine-night/HANDOFF.md
---

# 🔌 agent-event-ingest — шов «событие агента → граф FF» (глубокий разбор)

> Модуль-дом темы D3. Держит одну границу: как реальные события агентов (что произошло в раннере)
> попадают в граф-субстрат FF **без утечки PII владельца**. Сейчас — БЛОКЕР перед оживлением трубы.

## Что за модуль
Труба приёма: внешний раннер (agents-manager / «Движ») порождает события (`query()`, agent_run,
agent_trace) → FF принимает их как узлы/акты графа. **Писатель D1 уже построен** (surface
`agent-event-ingest.ts`, `admit()` на `agent_trace`, fail-closed `parseEventDrop`, 238 тестов PASS —
см. первоисточник ночи). Чего НЕТ: перехода от fixture к **реальному** источнику, потому что реальный
источник (`gateway.db`) содержит PII владельца, а границы очистки/согласия ещё не решены.

## Связь с соседями
- **D1 (построен):** этот модуль = семантика ВХОДА в тот же шов; D1 — механика приёма (уже есть).
- **M-G1 (движок памяти):** события ложатся в append-only журнал (`observation`/agent_trace) движка.
- **ADR-0014 C3 (стыковка):** consent/`hard_erase`-гейт спроектировать ДО первой строки IRunLogger.
  Открытый в C3 вопрос — гейт в раннере Движа (ДО того как FF увидит данные) ИЛИ на границе приёма
  FF — это ровно вопрос §3 этого дома (песочница/read-only/где чистим).
- **V7 Согласие:** ключевая ценность-ограничитель (referent/visibility/use≠read/right-to-erasure).

## Статус
**draft · owner-заблокирован.** Форма писателя готова и обратима; открыты 3 решения владельца
(поля-не-PII, судьба `summary`, песочница vs боевой). До ответов — реальные события НЕ пускаем.

## Карта дома
- `OVERVIEW.md` — владельцу-понятным языком: суть, почему блокер сейчас, что решаем.
- `questions/` — открытые вопросы (по одному `.question.md`).
- `analyses/pii-boundary-2026-09-15.analysis.md` — снапшот фактуры ночи (PII-граница, почему отложено).

## Первоисточник (trace, не дублировать)
Тема выросла из автономной ночи **2026-09-15**. Полное сырьё и решения живут в log-папке (append-only):
`docs/_log/2026-09-15-autonomous-spine-night/` — `HANDOFF.md` §4/§5, `OWNER-DECISIONS.md` (D3-live).
Этот дом — knowledge (как устроено), лог — trace (что произошло). Дубля смысла не держим.
