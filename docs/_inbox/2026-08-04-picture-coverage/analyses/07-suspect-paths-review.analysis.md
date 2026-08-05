---
node_type: analysis
title: "Сторона 2 медали: где пересмотренное — недоделка пути, а где сам путь неверен"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ./00-COVERAGE-MAP.synthesis.md
  - ./coverage/03-readability-identity.coverage.md
  - ./coverage/04-trust-vitality.coverage.md
  - ./coverage/05-sovereignty-relationality-consent.coverage.md
  - ../questions/INDEX.md
  - ../../../02-project/core/00-kernel/open-questions.md
  - ../../../02-project/core/00-kernel/kernel-acceptance-tests.md
  - ../../../02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - ../../../02-project/core/01-brain/01-overview/01-values/02-tozhdestvo/03-vetvleniye-i-varianty/README.md
source:
  - docs/_inbox/2026-08-04-picture-coverage/analyses/00-COVERAGE-MAP.synthesis.md §3,§5,§6
  - docs/_inbox/2026-08-04-picture-coverage/analyses/coverage/03,04,05-*.coverage.md
  - docs/02-project/core/00-kernel/open-questions.md (KQ-1, KQ-11)
  - docs/02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - packages/ingest-rentacar/src/dedup/same-as-writer.ts
  - git log a02f759 (M2 dedup commit)
---

# Сторона 2 медали — переоткрыть или углубить

> Критик. Метод: каждый подозреваемый путь проверен по факту/цитате (не по вкусу), различаю
> "путь ок, просто не достроен" от "путь сам создаёт риск/долг, который недоделка не лечит".

## Таблица

| # | Путь | Вердикт | Несущесть | На чём висит | Рекомендация | Цитата-основание |
|---|---|---|---|---|---|---|
| 1 | Канон метит "REAL"/"proven" без code-check (access_event, T-7) | **WRONG-PATH** (практика пометки, не design-first сам по себе) — CONFIRMED, рецидив | ВЫСОКАЯ — подрывает доверие к ЛЮБОЙ пометке статуса во всём каноне, не к одной грани | T-7 "Phase-1 status: REAL" (только I-1/I-2, не сама 6-звенная цепочка); `system_telemetry→cost-tree` связь, названная рабочей в 01-building-blocks; 5 случаев в одном сегменте | Переоткрыть СЕЙЧАС, но не "design раньше кода" (это нормально для DESIGN-фазы) — а правило "REAL/proven требует grep-цитаты кода при простановке", как раньше договорено про S7 | coverage-map §5: "тот же класс, что нашли на S7 durable-store... здесь пять случаев одновременно" |
| 2 | `cost-tree` засчитан за покрытие Витальности | **UNFINISHED** (не путь неверен — это была ошибка учёта волны-1, уже исправлена волной-2) | 6/6 граней Ц4 всё ещё designed-only, но НЕ из-за редукции ценности — из-за того что 6 механизмов просто не начаты | `cost-tree` = сумма токенов, 0 совпадений decay/consolidat/forgetting/metabolism в коде | Не переоткрывать модель Витальности; строить сами 6 механизмов (P2, Priority 16 — 06-metabolism-governance) | coverage-map §5: "Разрыв, ложное засчитывание волной 1"; 04-coverage §0.3 |
| 3 | `agent_trace` ephemeral/gitignored, нет линзы-потребителя для Доверия | **UNFINISHED**, разделение trace↔state само по себе корректная инженерия | Средняя — все 6 граней Ц3 designed-only, но не из-за этого разреза | `projection.ts:6-7`: acts fold into state, trace "NEVER touch the graph's state" — намеренно, не забыто; retention access_event явно "short, days-weeks" по дизайну | Не переоткрывать разрез trace/state; спроектировать READ-side consumer (audit/calibration lens) поверх короткоживущего trace — не обязательно "durable" | act-kinds.design.md таблица: retention access_event = "Short — security/audit window"; 04-coverage §0.1 |
| 4 | dedup (M2, shipped) без защиты вариантов (`variant-of`) | **UNCERTAIN** — риск живой, но confirm-gate частично смягчает | ВЫСОКАЯ — уже в проде на реальных данных ga-rentacar, не гипотетика | Design-док вариантов (2026-07-09) прямо: "Дедуп-движок обязан НЕ съесть варианты"; M2 (2026-08-03) шипнут без `variant-of` в коде (0 совпадений); merge НЕ авто (candidate→confirm через `same-as-writer`, ручной actor `agent:ga-rentacar-dedup`) | Переоткрыть СЕЙЧАС порядок: либо владелец явно принимает риск на confirm-gate как достаточный барьер, либо `variant-of`-флаг встраивается в confirm ДО следующего волны мержей | git a02f759 commit msg: "auto-merge structurally impossible"; facet 03-README: "Дедуп-движок обязан НЕ съесть варианты" |
| 5 | KQ-11: память = проекция/`insight-EDGE`, ядро осталось OPEN к ратификации | **UNCERTAIN** — путь разумен, но опирается на САМЫЙ слабый корень карты | Средне-высокая — вся Реляционность (avg depth 0.67, худший корень) + модель памяти вертикального сценария | `edge-as-citizen` = "shape-skeleton, НЕ функционирует" (нет id/confidence, `validFrom/validTo` "RESERVED, NOT folded"); KQ-11-Q2 просит ратификацию `insight-EDGE` именно на этом субстрате | Не ратифицировать KQ-11-Q2 вслепую; либо явная оговорка "ratify now, edge усилим позже", либо сначала минимальный shape `edge-as-citizen` | open-questions.md:188-193 (KQ-11 ядро OPEN); 05-coverage: "edge-as-citizen... НЕТ своего id/confidence" |
| 6 | KQ-1: ветка = форк ленты vs проекция | **NOTED** (не переоткрывать — прямая просьба владельца) | Высокая номинально (корневой примитив), но заморожена волей владельца | владелец: "пока не думать" | Оставить открытым явно как корневой риск, не трогать | questions/INDEX.md: "ветка = форк ленты или вариант проекции? (не кодом, владелец: пока не думать)" |
| 7 | (доп.) Термин "линза" не определён строго каноном (3 proven vs 9 designed-only) | **UNCERTAIN** — не путь дизайна, а дыра в базисе, искажающая ВСЮ систему скоринга | Высокая — влияет на Priority-числа Ц1/02, Ц4, и на саму иерархию "ценности>линзы>акты" | `terminology.md` строго = `ViewDef.kind`; coverage широко считает `customer-lens.ts`/`cost-tree` как линзы | Дёшево закрыть: явное ADR/решение по `terminology.md` §4 до следующего раунда скоринга | coverage-map §6: "иерархия — тенденция, не закон... нельзя без явной оговорки уровня строгости"; 03-coverage: "граница... не решена каноном" |

## Топ-3 на переоткрытие

1. **#1 — практика "REAL без code-цитаты".** Рецидивирует (S7 + 5 новых случаев за один прогон), бьёт по доверию ко ВСЕМУ канону, а не к одной грани — самый несущий и самый дешёвый фикс (правило, не редизайн).
2. **#4 — dedup без `variant-of` в проде.** Единственный риск из семи, что уже трогает реальные данные живого тенанта сейчас, не гипотетика будущей грани.
3. **#5 — KQ-11 ратификация на слабейшем корне (Реляционность).** Ратифицировать решение поверх недостроенного edge-субстрата — риск, что "ратифицировано" придётся переоткрывать повторно, когда `edge-as-citizen` дорастёт.

## Где не уверен критик — нужен владелец/Fable

- **#4**: смягчает ли ручной confirm-gate риск достаточно, чтобы НЕ блокировать дальнейшие merge-волны в ga-rentacar до `variant-of`? Это компромисс скорость/безопасность, не факт — решение за владельцем.
- **#5**: стоит ли ратифицировать KQ-11-Q2 сейчас с оговоркой "edge усилим позже", или ратификация должна ждать минимального `edge-as-citizen`-шейпа? Обе стороны разумны, выбор — вопрос риск-аппетита, не факта.

Файл: `docs/_inbox/2026-08-04-picture-coverage/analyses/07-suspect-paths-review.analysis.md`
