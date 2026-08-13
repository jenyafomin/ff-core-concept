---
type: overview
status: active
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: навигатор implementation-треков M5/actor-model — по одному узлу-папке на тему; каждый растёт сам
related:
  - ../../../../../../_log/2026-08-12-direction-review-and-both-as-settings/SYNTHESIS-direction.md   # откуда взялись (direction-review, 2 волны + проверяющие)
  - ../m5-surface-identity/                                                                          # дом-истина исходных анализов
  - ../decisions/OWNER-FORKS-2026-08-12.decision.md
---

# Implementation-треки (M5 / actor-model) — навигатор

> Каждая тема направления вынесена в **свою папку-узел**, чтобы дальше развиваться самостоятельно.
> Файлы здесь — `.design.md` **«как правильно реализовать»** (impl-вид). Это НЕ дубликат анализа: глубокий
> анализ живёт в своих домах (`m5-surface-identity/`, brain `01-file-unit/`, decisions) — тут указатели + разрешение развилки.
> **Фаза DESIGN: код НЕ построен.** «Как реализовать» = проект, реализация ждёт явного «строй» владельца.

## Мета-принцип разрешения развилок (владелец, 2026-08-12)
> В каждой развилке «либо/либо» раздели **ИНВАРИАНТ** (ровно ОДИН якорь — удваивать нельзя) от
> **ОСЕЙ-НАСТРОЙКИ** (где оба варианта законны). Переключатель на оси — **не предпочтение оператора, а
> ПРОВЕРЯЕМОЕ условие**: ТИП единицы · СОСТОЯНИЕ системы · СТАДИЯ зрелости. Якорь строим сейчас, варианты
> резервируем ФОРМОЙ. Строить сырой тумблер до того, как назван якорь = «турникет до стены» / footgun.

## Треки
| # | Трек | Тип | Развилка → разрешение (инвариант / ось) | Статус |
|---|---|---|---|---|
| **01** | [root-of-trust](./01-root-of-trust/01-how-to-implement.design.md) | FORK | Инвариант: корень ДОЛЖЕН быть НАЗВАН (`policy:seam-authority`, Constitution-clamp). Ось: стадия (ISO-2→ISO-3). A/B = последовательность, B в резерв | rec **C-гибрид**, ждёт «строй» |
| **02** | [topology](./02-topology/01-how-to-implement.design.md) | FORK | Инвариант: один шов-модуль, `coupling=0`. Ось: состояние системы (uid-split+P-5), НЕ флаг оператора | rec **broker-seed co-located** (авто-следствие 01) |
| **03** | [isolation-uid-split](./03-isolation-uid-split/01-how-to-implement.design.md) | BUILD ⚑длинный полюс | Инвариант: принципал подделываем ТОЛЬКО движком (kernel-enforced write-disjointness). Меню механизмов (uid/процесс/namespace) по классу доверия, пол = hard-OS для недоверенного | **дизайн-каркас** (не начат до этого); 3 под-вопроса → под-папки |
| **04** | [seam-authority-defect](./04-seam-authority-defect/01-how-to-implement.design.md) | BUILD | Живой дефект: `required` → `TS2741` (`principal-seam.test.ts:24-28`). Фикс: держать required (инвариант G4) + 1 строка фикстуры + починить трекинг | **подтверждён вживую**, фикс готов, ждёт «строй» |
| **05** | [gateway-dup](./05-gateway-dup/01-how-to-implement.design.md) | BUILD (чужой репо) | Корень: дедуп только ПОСЛЕ транскрипции + offset in-memory → краш=дубль. Фикс: durable ingress-latch на `update_id` ДО транскрипции + unique-index | work-order готов; правки в agents-manager — отдельная сессия |
| **06** | [file-unit](./06-file-unit/01-how-to-implement.design.md) | FORK (concept) | Развилка M-a/b/c мнимая: 3 оси. ② тождество (`canonical_id`) = ЭКСКЛЮЗИВ; ①③ носитель/правка = настройка по типу (ADR-0006). ГЕЙТ=Q3 (минтинг) | **не decision-ready**: нужен ответ на Q3 или диалог. Дом-истина: `02-project/core/01-brain/03-unit/01-file-unit/` |

## Секвенс
`01=C → 02 авто → (05 gateway-dup ‖) → 03 uid-split ДИЗАЙН → populate P-5 → флип ③`
Узкое место = **03 (uid-split)**: единственный трек с дизайном=0; даёт «зубы» треку 01 и P-5.
Второй живой полюс = **04** (дефект в уже закоммиченном коде, чинится независимо).

## Флаги (для следующей волны / doc-discipline)
- `analyses/03-ingest-dedup-smell.analysis.md` — **mislink**: про ga-rentacar ingest, НЕ про gateway-dup. Развести/переименовать.
- `m5-surface-identity/` — нет INDEX-навигатора (долг); треки 01/02/03/04 ссылаются на его файлы как на дом-истину.
- Треки 03/04/05 заземлены на реальный код (spawn без uid; TS2741; telegram-channel.ts:449-470) — не только на прозу сводки.

## Открыто владельцу (выше треков)
См. `SYNTHESIS-direction.md §5`: (а) ратифицировать проделанное (Стадия-1 · ADR-0010/0011 · T5 — статус снят с ложного `approved` на `review`); (б) фокус: trust-фронтир вперёд ИЛИ отдельная волна по **продуктовой высоте** (Hub · Telegram-модуль · агентский слой · Задачи · rental-balance).
  - ➕ **РАЗРЕШЕНО (2026-08-12, D2 landed via owner delegation):** рекомендация (а) «ADR-0010/0011 → `review`» **СНЯТА** — D2 ратифицирован, оба ADR = genuinely `approved` с provenance-строкой (трёхсторонняя рассинхронизация статуса схлопнута). D4 = converged package (decided/closed once), D5-main = broker-seed (decided). Каноничный вердикт: `../decisions/2026-08-12-owner-eye-forks/SYNTHESIS-owner-eye-verdicts.md`.
