---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-09-15
Scope: project
node_type: analysis
module: agent-event-ingest
Related:
  - ../README.md
  - ../OVERVIEW.md
  - ../questions/01-safe-fields.question.md
  - ../questions/02-summary-freetext.question.md
  - ../questions/03-sandbox-and-access.question.md
  - ../../../../../../../architecture/ADR/ADR-0014-integration-strategy-memory-runtime.md
  - ../../../../01-overview/01-values/07-soglasie/README.md
  - ../../../../../../../_log/2026-09-15-autonomous-spine-night/HANDOFF.md
---

# 🧭 Снапшот: PII-граница приёма событий (ночь 2026-09-15)

> Консолидированный СНАПШОТ, не слепая копия. Полное сырьё/решения ночи — trace-первоисточник:
> `docs/_log/2026-09-15-autonomous-spine-night/` (`HANDOFF.md` §4/§5, `OWNER-DECISIONS.md` D3-live,
> `REVIEW-D1.md`). Этот файл — knowledge (как устроена граница и ПОЧЕМУ отложено), лог — что произошло.

## 1. Что было построено (и стоит на месте)
Писатель D1 — форма приёма — **готов и проверен**: surface `agent-event-ingest.ts`, `admit()` на
`agent_trace`, fail-closed `parseEventDrop`, **238 тестов PASS**, reviewer = PASS (аддитивно, обратимо,
не закоммичено — ветка `refactor-tree`). Типовая граница telemetry≠life держится **системой типов**
(`isProjectable` по `actKind`), а не конвенцией — поэтому хардкод source-маркера был ОТБРОШЕН как
инертный дубль (HANDOFF §4).

## 2. Почему «один реальный факт» ОТЛОЖЕН — красная линия V7
Труба построена, но пуста: она принимает **fixture**, а не реальные события. Чтобы записать НЕ выдуманный
факт, нужно прочитать источник — а источник это:

- **`gateway.db`** — SQLite базы раннера agents-manager, где лежит **реальный PII владельца**
  (переписки, содержимое запросов, тексты).
- **Экспортёра НЕТ.** Read-only канала `gateway.db` → AgentEvent с PII-очисткой не существует.
- Значит **наивный прогон переоткрыл бы утечку V7**: сырой личный текст лёг бы в append-only журнал
  графа — необратимо (enforcement `hard_erase`/tombstone пока НЕ подключён, только форма — V7, ADR-0014
  C4). Это прямое столкновение с V7 «одно согласие на прочитать ≠ согласие на использовать».

Урок ночи (не потерять): **пустое хранилище — не повод сливать реальность наивно**; фундамент под
закрытие гэпа заложен корректно, без гадания вперёд реальности (HANDOFF §6).

## 3. Где именно проходит граница (карта решения)
```
[gateway.db · реальный PII]
        │  (нужен: read-only экспортёр — НЕ построен)
        ▼
   [PII-гейт]   ← ADR-0014 C3 ОТКРЫТО: гейт в раннере Движа ИЛИ на границе приёма FF?
        │        поля: Q1 (allow-list метаданных) · Q2 (судьба summary)
        ▼
[admit() → agent_trace → append-only журнал M-G1]   ← сюда пишем ТОЛЬКО очищенное; первый прогон = песочница (Q3)
```

## 4. Что осталось решить (входы в 3 вопроса дома)
- **Q1 — safe-fields:** allow-list метаданных (eventId/unitId/scope/kind/severity = да; payload/content =
  PII до доказательства). Fail-closed.
- **Q2 — summary:** свободный текст → drop / hash / filter / as-is-под-согласие. **Односторонняя дверь**:
  первая реальная запись фиксирует поведение (append-only, откат только tombstone).
- **Q3 — песочница/доступ:** read-only к `gateway.db` · прогон в песочницу-журнал (не боевой) · не трогать
  процесс agents-manager. Стыкуется с ADR-0014 C3 (где стоит гейт).

## 5. Что ответы разблокируют
Ответы Q1–Q3 открывают дизайн **read-only экспортёра** `gateway.db` → AgentEvent с PII-очисткой и прогон
«одного реального факта» **в песочницу**. Это переход «пустая труба → живой граф» — безопасный, а не
наивный слив. До ответов реальные события НЕ пускаем (owner-блокер, статус дома = draft · owner-заблокирован).
