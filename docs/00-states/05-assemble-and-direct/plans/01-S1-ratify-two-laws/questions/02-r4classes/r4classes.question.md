---
node_type: question
title: "Q-R4classes — регime-B референт-классы: черновое МЕНЮ для admission-исключений (owner-fork R4, меню автономно)"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
kind: knowledge-candidate
lens: business-analyst (ценность/референт-классы) + критик-проход CLEAN 2026-08-09 (см. «Что не хватает»)
plan: ../../README.md
serves_owner_fork: ../../../../_shared/OWNER-QUEUE.md   # карточка Q-R4
sources:
  - ../../../../../_log/2026-08-08-orchestrated-design-push/work/D4-decision-lens-briefs.analysis.md   # R4 brief :86-121 (A/B/C)
  - ../../../../_shared/OWNER-QUEUE.md                                                                    # карточка Q-R4 :54-66 (VIP упомянут здесь, не в D4)
  - ../../../../../_log/2026-08-09-autonomous-question-closure/planning/QUEUE-questions.plan.md            # карточка Q-R4classes :95-110
  - ../../work/two-laws.invariant-candidate.md                                                             # U-L1 owner-box :77-90 (закон кладёт присутствие, не default/классы)
  - ../../../../../architecture/ADR/ADR-0009-erasure-witness-and-recursive-seam.md                         # :220-222 entropy-class unknown→conservative паттерн (аналогия, НЕ решение)
  - ../../../../../architecture/ADR/ADR-0007-erasure-and-admission.md                                      # :343-345 OQ-3 (топология) · OQ-4 (R4 дом)
  - ../../../../../03-projects/ga-rentacar/specs/02-ingest-acts.spec.md                                    # :29,:74-78 PII реального ingest (name/phone/Recent Note)
  - ../../../../../03-projects/ga-rentacar/decisions/06-groupB-data-pii.decision.md                        # :190-220 Emirates ID пробел в DEFAULT_PII_KEYS
  - ../../../../../../packages/ingest-rentacar/src/core/reduce.ts                                          # :77-95 реальные поля (name/phone/recentNote free-text; НЕТ поля возраста)
  - ../../../../../../packages/engine/src/core/admission.ts                                                # :26-43 DEFAULT_PII_KEYS (текущий словарь, поле-уровень, не референт-класс)
  - ../../../../../02-project/core/01-brain/01-overview/01-values/07-soglasie/05-revocation-erasure/README.md  # Ц-7 Согласие, FQ7 (согласие требует дееспособности)
  - ../../../../../02-project/core/01-brain/01-overview/01-values/V5-suverennost.md                        # Ц-5 Суверенность (асимметричный риск экспозиции)
  - ../../../../../02-project/core/01-brain/01-overview/01-values/V7-soglasie.md                           # Ц-7 определение
---

# Q-R4classes — МЕНЮ regime-B референт-классов (не решение)

## Вход / вопрос
R4 (`D4-decision-lens-briefs.analysis.md:86-121`) спрашивает владельца: есть ли у него **regime-B референт-
классы** — типы референтов, чей САМ ФАКТ существования в канонe нельзя допускать без явного исключения/
особого режима на admission-точке — и если да, какие. Сейчас список пуст, владелец должен придумать с нуля
под тикающий срок (первая реальная запись ga-rentacar PII фиксирует поведение НАВСЕГДА — `two-laws.invariant-
candidate.md:77-86`).

**Эта нода НЕ решает R4.** Она готовит СТАНДАРТНОЕ МЕНЮ типовых классов (взято из практики + названо в
брифах B4/OWNER-QUEUE), с ценностным обоснованием, реальным примером из ga-rentacar где возможно, и тем, как
каждый класс ложится на варианты A/B/C — чтобы владелец утром отмечал/добавлял, а не изобретал таксономию.

## Ставка
Меню — обратимо (документ, не код, не merge в спеку). Подготовка автономна («частично» по QUEUE-questions.plan
:106) — само НАЗВАНИЕ default (A/B/C) и включение конкретных классов остаётся владельцу. 1 линза
(business-analyst) + критик-проход (смугл-гейт: не превратить предложенный default-паттерн в тихое решение)
— вердикт CLEAN, см. «Что не хватает» ниже.

## Разбор
→ `analyses/01-r4classes-menu.analysis.md` — таблица 7 классов (определение · ценностный резон · реальный
пример · A/B/C-проекция с ценой A/B/C симметрично · обратимость/риск) + нейтральная сводка «если B, вот
стартовый набор» + названный (не рекомендованный) инженерный паттерн default-по-аналогии (ADR-0009
entropy-class).

## Что не хватает (честно, для владельца/следующей итерации)
1. **Критик-проход выполнен — вердикт CLEAN** (2026-08-09, координатор-критик): меню держится как линза,
   не смугл. По итогу критика добавлены 2 недостающих класса (биометрия/KYC-скан · умершие референты,
   §6/§7 анализа) + симметричная «цена A» в проекциях всех 7 классов (был косметический крен к
   бездействию — цена B/C называлась явно, цена A нет). Оба пункта дополнены LOSE-NOTHING поверх исходных 5.
2. **VIP-класс качественно другой.** Остальные 4 класса (minors/health/court-orders/no-trace) естественно
   ложатся на «admission-refuse». VIP, по разбору ниже, скорее просит **access-restriction ПОСЛЕ admission**,
   не отказ на входе — это находка, не решённый вопрос (см. анализ §4.5).
3. **No-trace класс пересекается с R3** (отдельный owner-fork, топологический остаток). Включение этого
   класса в R4-меню фактически подтягивает R3 вперёд — назвал, не решил (см. анализ §4.4).
4. **Emirates ID — не референт-класс, а поле-уровень.** Уже известный пробел словаря
   `DEFAULT_PII_KEYS` (`decisions/06-groupB-data-pii.decision.md:190-220`) — смежный, но другой вопрос
   (какое ПОЛЕ детектится), не «какой РЕФЕРЕНТ исключается». Не смешивать в решении владельца.
