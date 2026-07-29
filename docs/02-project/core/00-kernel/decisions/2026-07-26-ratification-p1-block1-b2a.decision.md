---
status: approved
owner: jenya.stasik@gmail.com
date: 2026-07-26
node_type: decision
title: РАТИФИКАЦИЯ ядра — P-1 (свойства вместо полюсов) + Блок 1 (твёрдые KQ) + B2-a (recallFeedback)
related:
  - ../prefer-properties-over-poles.design.md      # P-1 — дом принципа (approved этим актом)
  - ../open-questions.md                            # KQ-* реестр — статусы закрыты этим актом
  - ../../01-brain/01-overview/analyses/kq11-L0-reconciliation-2026-07-26.analysis.md  # B2-a рефлексивность
  - ../../../../_inbox/2026-07-26-kernel-ratification-unblock/1-confirmations.decisions.md  # реестр v2 (стадия)
  - ../../../../_inbox/2026-07-26-kernel-ratification-unblock/2-ratification-2026-07-26.decisions.md  # запись согласия (стадия → редирект)
  - ../../../../_log/2026-07-26-kernel-ratification-unblock/HANDOFF.md
---

# ✅ РАТИФИКАЦИЯ ядра — 2026-07-26

> **Дом-истина ратификации.** Владелец дал явное «Стартуй ратификацию» (2026-07-27) на 🟢-пакет
> (согласие голосом 2026-07-26: «в целом согласен, почти всё да»). Этот файл — durable-запись того,
> ЧТО стало каноном, вынесенная из `_inbox/`-стадии в постоянный дом ядра. Стадийные реестры
> (`_inbox/…/1-confirmations`, `…/2-ratification`) остаются как trace + редирект сюда (LOSE-NOTHING).

## Что ратифицировано (draft → approved)

### 🧭 P-1 · Принцип «свойства вместо полюсов»
Принят как **канон метода ядра**. Всякая развилка сперва проходит тест «оба / либо / комбинация /
спектр»; законна для разных единиц → разрешается **свойством** (паспорт-поле / policy-as-data /
lens-конфиг) с безопасным дефолтом. Зажимы/врата/эрейж/append-only — **остаются жёсткими**, НЕ конфиг
(тест-различитель T1/T2/T3 в доме принципа).
- Дом: `../prefer-properties-over-poles.design.md` → **status draft → approved** этим актом.

### 🟢 Блок 1 — твёрдые (закрывают KQ в реестре)
| id | KQ | Ратифицированное решение | Реестр |
|----|----|--------------------------|--------|
| B1-a | **KQ-3** | Политика правится только через `core:manage-*` + genesis-нота (meta-cap-gate). | RATIFIED |
| B1-b | **KQ-5 / KQ-6 / KQ-7** | Время: `temporal: uni \| bi` на тип, дефолт `uni`; `recordedAt` — на акте; valid-time = интервал `[validFrom, validTo)`. | RATIFIED |
| B1-c | **KQ-12** | `salary`/`person` field-level deny = канон-пример фальсифицируемости шага 8; механизм = видимость поля через policy-as-data. | RATIFIED |
| B1-d | **KQ-13** | Добавить 11-й шаг «plugin-upgrade» в vertical-сценарий (покрывает GPT test 6). | RATIFIED |
| B1-e | **KQ-10** | Агрегаторы `sum/avg/count`: выбор из enum = данные (R1, свойство); расширение enum = код+ADR (R3, жёсткая граница). **Ship в Phase-1.** Снимает 🔴-блокер «step 10 доказан в Phase 1». | RATIFIED |
| B1-f | **KQ-14** | Стратегия: **консолидация ВГЛУБЬ, не вширь** (killer-README). | RATIFIED |

### 🟢 Блок 2 — B2-a (рефлексивность памяти как свойство)
- **KQ-11 (фасет рефлексивности)** — ложная дилемма снята слоями. Поле
  **`recallFeedback: off | passive | active`**, **дефолт `passive`**; `active` разрешён как опция
  **с клапаном затухания** (иначе самоусиление/дрейф доверия, Г7).
- Дом-механика: `../prefer-properties-over-poles.design.md` §5 (approved).
- ⚠️ **KQ-11 закрыт ЧАСТИЧНО:** ратифицирован только фасет рефлексивности (recallFeedback). Ядро
  KQ-11 (проекция vs first-class node → `domain_event` vs `observation`, = B3-a/KQ-11-Q2) остаётся
  **OPEN**, ждёт фиксов Блока 3.

## Что НЕ ратифицировано (осознанно вынесено)
- 🟡 **Блок 3 (AMEND):** гринлайт на фиксы критика (свести 3-й дом act-kinds §5; два carve-out I-4 → один
  патч; перепроверить carve-out I-5; переименовать `epistemic-band`). Ратификация — ПОСЛЕ фиксов.
- 🔴 **Блок 4 (B4-a) + MUST-TRACK (OQ-1/2/4/5):** отдельный совет «эрейж ⟂ file-first/git». 🔴 CRITICAL:
  crypto-shred недоказуем против payload в git-истории (ADR-0006), смыкается с Г20. OQ-3 = честный
  предел (в ADR-0007 Consequences).

## Откат
Всё обратимо: `git` хранит прежние статусы. Откат = вернуть frontmatter `approved → draft` в
`prefer-properties-over-poles.design.md` и статусы KQ в `open-questions.md`, удалить/архивировать этот файл.

## Следующий ход по ветке A (НЕ этим актом)
1. Запустить фиксы Блока 3 (агентами).
2. Отдельный совет «эрейж ⟂ file-first/git» с втянутыми MUST-TRACK OQ-1/2/4/5 + Г20.
