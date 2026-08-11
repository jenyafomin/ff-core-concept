---
node_type: analysis
title: "Q-critical-faces — synthesis after critic-check (DIRTY→fixed): критические 20%/26% + owner-question"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
question: ../critical-faces.question.md
analysis: ../analyses/01-critical-faces.analysis.md
critic_verdict: DIRTY (co-orchestrator relay, 2026-08-09) — 3 правки применены, топ держится с расширением
owner_queue_card: ../../../../../../_shared/OWNER-QUEUE.md#Q-critical-faces-f3f4
---

# Q-critical-faces — synthesis

## Критик-вердикт (relay)
DIRTY на первом черновике, 2 из 3 находок — правки атрибуции/структуры (не меняют топ), 1 —
содержательная (F3 задвинута ошибочно). Все три применены точечно в
`../analyses/01-critical-faces.analysis.md` (см. пометки "ИСПРАВЛЕНО критик-проверкой" в тексте):

1. **F3 недооценена census-синтезом.** Первоисточник `raw/02-paired-faces.map.md:52-56` называет F3+F4
   ОДНОЙ "deepest mechanical hole" (одна write-гонка journal-fsync/blob-write, `store-durable-fs.ts:173`);
   F3 = причина (durability-order), F4 = следствие (orphan). Census-синтез разрезал пару и словом
   "runner-up" понизил F3 отдельно от F4 — потерял вес первоисточника.
2. **Атрибуция смугла исправлена.** Источник понижения F2/F3/F4 из `🟥 БЛОК` в "отложить-с-домом" — сама
   census-синтез-сессия 2026-08-06 (`00-width-census.synthesis.md:90-92`), противоречащая собственной
   матрице той же сессии (`:65-68`). Task-pool (`task-pool.md:62`) лишь ВЕРНО унаследовал это понижение —
   не источник, канал передачи. Черновик изначально адресовал вопрос не туда.
3. **Owner-вопрос оформлен явно** (этот файл + карточка в `OWNER-QUEUE.md`), как линза с рычагом, не
   вердикт — см. ниже.

## Итоговое ранжирование (после правок)
**Критические 20-26% (5 граней матрицы, 4 пункта повестки):** F6 (form-agnosticism sufficiency, keystone
G2/Закон-2, блокирована S3-гейтом) · §9-4 (property-based fault-injection + независимый oracle,
закон-независима, assignment готов) · F2 (erased-read contract, G1-форма) · **F3+F4 пара** (durability-
order + orphan-payload sweep — одна write-гонка, не разносить).

**Откладываем без спора (9 граней):** §9-5, §9-6, §9-7 (вакуозен), §9-8, §9-9, S11, S12, F5 (→FORK-2), F1
(→D1.c/Q1). **Уже закрыты (5 граней):** §9-1, §9-2, §9-3, §9-3b, S10.

Полная таблица + обоснование по каждой грани — `../analyses/01-critical-faces.analysis.md`.

## Owner-question (карточка → `OWNER-QUEUE.md`)
Форк не агентский (интерпретация НАМЕРЕНИЯ прошлой census-сессии + подтверждение состава топ-20% —
затрагивает pre-S4 ворота владельца, `plans/04-S4plus-breadth/README.md:25-26`). Две части:

1. Был ли даунгрейд F2/F3/F4 из `🟥 БЛОК` (census-матрица) в "отложить-с-домом" (census-рекомендация,
   тот же документ, `00-width-census.synthesis.md:65-68` vs `:90-92`) НАМЕРЕННЫМ решением, или разрыв
   между матрицей и рекомендацией — техническая неаккуратность свода трёх карт в одну?
2. Входит ли F3 в критические 20% РЯДОМ с F4 (пара по первоисточнику `raw/02-paired-faces.map.md:52-56`),
   или есть основание держать её отдельно/ниже, как считал census-синтез?

**Рычаг:** прямой вход в pre-S4 ратификацию — этот синтез готовится именно как черновик, который владелец
подтверждает/правит одним проходом, не собирает с нуля.

## Статус
`review` — критик-check пройден (DIRTY→исправлено), ждёт owner-ответа на карточку в `OWNER-QUEUE.md`.
LOSE-NOTHING: ничего не удалено, `analyses/01-critical-faces.analysis.md` сохраняет весь ход рассуждения
включая первую (неверную) атрибуцию с пометкой "ИСПРАВЛЕНО".
