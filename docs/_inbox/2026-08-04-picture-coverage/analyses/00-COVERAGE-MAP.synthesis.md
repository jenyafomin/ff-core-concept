---
node_type: synthesis
title: "Мастер-карта покрытия: 7 ценностей × 6 граней — гейт волн 1-2 + единый приоритетный стек"
status: active
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../README.md
  - ./01-building-blocks.analysis.md
  - ./02-values-lenses-acts-frame.analysis.md
  - ./coverage/03-readability-identity.coverage.md
  - ./coverage/04-trust-vitality.coverage.md
  - ./coverage/05-sovereignty-relationality-consent.coverage.md
  - ../decisions/priority-stack.decision.md
  - ../questions/INDEX.md
source:
  - packages/engine/src/core/resolve.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/view-compiler.ts
  - packages/engine/src/surface/cli.ts
---

# Мастер-карта покрытия

> Гейт + синтез волн 1-2 бокса `picture-coverage`. Числа взяты из трёх coverage-файлов (grep/read
> проверены построчно теми волнами), три самых весомых claim'а спот-проверены заново независимо
> (см. §3). Ничего не пересчитано заново с нуля — только агрегация + верификация.

## 1. Заголовок покрытия

- **M1 (бинарное, глубина ≥2 из 42 граней): 8 / 42 = 19%.**
- **M2 (взвешенное, Σ(V×глубина) / Σ(V×3)): 157 / 450 = 35%.**
- **Ни одна из 42 граней не достигла глубины 3 (green-product).** Максимум — глубина 2 (green-unit),
  и она есть только у 8 граней (1 в Тождестве, 4 в Суверенности, 3 в Согласии). Это ожидаемо и явно
  зафлаговано всеми тремя coverage-файлами (проект в фазе DESIGN — потолок глубины 2 самоограничен).

## 2. Таблица 7 корней

| Корень | #граней | ср. глубина | P0/P1/P2/P3 (дыры) | Статус одной фразой |
|---|---|---|---|---|
| Ц1 Читаемость | 6 | 0.50 | 0/0/4/2 | Половина граней на 0 (temperature/dual-audience/fractal-stability не начаты); паспорт есть на бумаге, полей нет в `EnvelopeNode`. |
| Ц2 Тождество | 6 | 0.83 | 0/1/3/2 | Единственный green-unit случай всего бокса (`kriteriy-i-dedup`, shipped в ga-rentacar) — но БЕЗ предохранителя от вариантов (P1-риск). |
| Ц3 Доверие | 6 | 1.00 | 0/1/1/4 | Все 6 designed-only. `data-honesty` (P1) — тихая ложь единиц/валют, ретрофит невозможен. |
| Ц4 Витальность | 6 | 1.00 | 0/0/2/4 | Все 6 designed-only; единственная соседняя green-линза (`cost-tree`) ошибочно засчитывалась как покрытие — не закрывает ни один механизм. |
| Ц5 Суверенность | 6 | 1.67 | 0/0/4/2 | Самый закрытый корень — policy-стек и capability реально green-unit; `engine-contract`/`foreign-residence` не начаты вовсе. |
| Ц6 Реляционность | 6 | 0.67 | 0/0/3/3 | Самый слабый корень — только `Edge.provenance` и cardinality-fold в коде, ни один не бьёт точно в грань (cascade/variants/composition = 0). |
| Ц7 Согласие | 6 | 1.33 | 0/1/5/0 | `visibility`/`use-vs-read` реально green-unit (PEP), но `consent-taint` (P1) — полный ноль: прямой риск обхода `resolve()` через агрегат/линзу. |

**Итого по всем 42 граням:** P0=0 · P1=3 (Ц2/03, Ц3/06, Ц7/04) · P2=22 · P3=17.

## 3. Гейт: консистентность рубрики

Все три coverage-файла применяют **одну и ту же** шкалу глубины (0-3), одну и ту же формулу
`Priority=(V×G×R×Rdy)/C` и одни и те же бакеты (P0≥60·P1 30-59·P2 12-29·P3<12) из `02-values-lenses-acts-frame.analysis.md` §3-4 — проверено построчно пересчётом нескольких строк из каждого файла (напр. Ц1/passport: (4×2×4×2)/3=21.3 ✓; Ц3/data-honesty: (4×2×5×2)/2=40 ✓; Ц5/self-describing: (4×1×2×3)/2=12 ✓). **Расхождений в применении рубрики НЕТ.**

Единственная найденная нестыковка — не в скоринге, а в **грунтовке**: `01-building-blocks.analysis.md`
сам фиксирует (§«Где доки/код расходятся» п.1), что сосед-файл `02-values-lenses-acts-frame.analysis.md`
§1.3 называет ≈5 ActKind (пропущен `command`), тогда как код и `01-building-blocks` дают 6. Все три
coverage-файла де-факто используют правильный 6-элементный список (цитируют `types.ts` напрямую) —
скоринг не пострадал, но это гигиенический долг в базисе.

## 4. Спот-верификация 3 claim'ов (перепроверено независимо, не только повторено из 04-coverage)

**(a) `access_event` не эмитируется кодом — CONFIRMED.**
`grep access_event packages/engine/src` даёт только `types.ts:174` (объявление вида) и комментарий
в `projection.ts:6`. Ноль совпадений в `resolve.ts`. Design-doc заявляет «written by `resolve()`»,
код этого не делает.

**(b) explain-chain/T-7 нигде не собран (нет inspect/explain CLI) — CONFIRMED.**
`grep -i "explain|inspect" packages/engine/src/surface/cli.ts` — 0 совпадений. Кернел-тест T-7
помечен «Phase-1 status: REAL» в `kernel-acceptance-tests.md:232`, но это относится только к
пред-условиям (actor+provenance на конверте, I-1/I-2), не к самой 6-звенной сборке цепочки — канон
завышает статус относительно кода.

**(c) `cost-tree` считает только сумму токенов, не реализует механизмы Витальности — CONFIRMED.**
Прочитан `view-compiler.ts:67-100` (`costTree`) — итеративный обход `delegates-to` с loop-guard и
depth-bound, агрегирует числовое поле (`body.tokens` по умолчанию) в `own/subtree/direct`. Плюс
`grep "decay|consolidat|forgetting|reinterpret|pending|metabolism|governance-ceiling|budget"
packages/engine/src` → **0 файлов**. Ни один из 6 механизмов Витальности не имеет кода нигде в engine.

## 5. Разорванные цепочки / канон завышает статус (класс риска — рецидив durable-store)

| Цепочка | Заявлено каноном | Проверено кодом | Вердикт |
|---|---|---|---|
| `agent_trace` → линза | Существует как вид акта, должен обслуживать Доверие | `projection.ts:6-7`: явно «NEVER touch the graph's state»; ни одной линзы-потребителя | Разрыв, канон честен (сам называет debug-artifact) |
| `access_event` → аудит-линза | «Written by `resolve()`/the PEP itself» (design-doc) | 0 записи кодом нигде | **Разрыв, канон завышает** |
| `command` → explain-chain (T-7) | T-7 «Phase-1 status: REAL» | Нет `inspect`/`explain` CLI, цепочка не собирается | **Разрыв, канон завышает** |
| `system_telemetry` → `cost-tree` | 01-building-blocks: связь названа рабочей (п.2 «Связи акт→линза→ценность») | `act-kinds.design.md` §5 сам: «deferred as its own stream»; `cost-tree` реально читает `domain_event.cost_ref→snapshot`, НЕ `system_telemetry` | **Разрыв, инвентарь волны 1 завысил статус** (поправлено волной 2) |
| `cost-tree` → метаболизм-governance (Ц4/06) | Соседствующая green-линза иногда читается как «покрытие» этой грани | Сумма токенов ≠ potolok/decay/садовник; 0 совпадений механизмов | **Разрыв, ложное засчитывание волной 1** |

**Значение для владельца:** это тот же класс, что нашли на S7 durable-store (доки говорят «green»,
код — нет). Здесь пять случаев одновременно, все в самой чувствительной паре ценностей (Доверие +
Витальность) — обе сейчас designed-only на 100% граней (6/6 каждая).

## 6. Проверка иерархии владельца «ценности(много) > линзы > акты»

Держится **только** в одном прочтении: грани-ценности (42) И линзы широко (9, включая 6
designed-only наравне с 3 proven-code) → 42>9>6. Переворачивается на строгом счёте (кернел-канон,
только 3 доказанные линзы `cost-tree/visible-to/actions-by-agent`): 3 < 6 видов актов — низ пирамиды
шире середины. Обе точки зафиксированы в `01-building-blocks.analysis.md` (таблица «Проверка гипотезы»)
и не переоспорены coverage-волной — гейт подтверждает: **иерархия — тенденция, не закон**, ставку на
неё для аргументации приоритетов делать нельзя без явной оговорки уровня строгости.

## 7. Единый приоритетный стек P0-P3 (грани + вопросы/идеи слиты в один ранжир)

| # | id | тип | бакет | Priority | Одной фразой |
|---|---|---|---|---|---|
| 1 | KQ-4 | question | **P0** | 75 | Trace-редакция (write-time vs read-time) — блокирует I-7/kernel-test 5 |
| 2 | policy-scope-project-vs-universal | idea | P1 | 45 | Перенести готовый Universal→Domain→Project scope на policy-узел (ADR-0004) |
| 3 | Ц3/06 data-honesty | facet-gap | P1 | 40 | Тихая ложь единиц/валют — ретрофит невозможен, заложить сейчас |
| 4 | folder-in-folder-restructuring | idea | P1 | 36 | Один дешёвый вопрос владельцу: docs-дерево или граф? |
| 5 | Ц2/03 vetvleniye-i-varianty | facet-gap | P1 | 32 | Dedup (уже shipped) без защиты от поедания намеренных вариантов |
| 6 | OQ-4 | question | P1 | 30 | batch-идемпотентность + egress-outbox не построены (dup-баг, половина) |
| 7 | Ц7/04 consent-taint | facet-gap | P1 | 30 | Нет наследования согласия при агрегации — риск обхода `resolve()` |
| 8 | KQ-8 | question | P2 | 26.7 | Revocation/erasure — crypto-shred недоказуем против file-first payload |
| 9 | client-n8n-toolkit | idea | P2 | 24 | «Клиент» — 3 нераспутанных прочтения (домен/коннектор/generic) |
| 10 | Ц2/01 kriteriy-i-dedup | facet-gap | P2 | 24 | Единственный green-unit во всём боксе — не хватает только продукт-проводки (M3) |
| 11 | Ц5/06 constitutional-ceiling | facet-gap | P2 | 24 | Green-unit, не доведено до продукта |
| 12 | Ц7/05 revocation-erasure | facet-gap | P2 | 24 | Erasure-seam green-unit, сам отзыв (tracking) — не найден |
| 13 | Ц1/01 passport | facet-gap | P2 | 21.3 | Fold-механизм green, но полей паспорта нет в `EnvelopeNode` |
| 14 | Ц3/01 provenance | facet-gap | P2 | 21.3 | actor+provenance green на акте, но «кто ДО СИХ ПОР ручается» не смоделировано |
| 15 | Ц7/01 referent | facet-gap | P2 | 21.3 | Фундаментальная грань (referent≠owner≠author), на ней держатся 02-06, не начата |
| 16 | Ц2/05 koreferenciya-i-konflikt | facet-gap | P2 | 20 | latest-wins green, но конфликт не становится видимым третьему |
| 17 | Ц7/06 custodial-override | facet-gap | P2 | 20 | Конституционный carve-out даже на бумаге не ратифицирован (ждёт KQ-8) |
| 18 | Ц1/04 temperature | facet-gap | P2 | 18 | Ни поля, ни политики push-фильтрации — полностью открыта |
| 19 | Ц5/02 policy-as-data | facet-gap | P2 | 18 | Green-unit, не доведено до продукта |
| 20 | Ц5/05 ownership-keys | facet-gap | P2 | 18 | Green-unit (capability.test.ts), не доведено до продукта |

Остаток (P2 хвост ≈14 + весь P3 ≈37, включая 6 вопросов/идей и 17 facet-gap) — в таблицах
`decisions/priority-stack.decision.md` и трёх `coverage/*.md`; не дублирую здесь (компрессия).

## 8. Рекомендация next

1. **Закрыть KQ-4 первым** (P0, единственный) — блокирует I-7/kernel-test 5, дешёвый (C=2), инфраструктура уже есть.
2. **Волна на Согласие/Доверие**: `data-honesty` (#3) + `consent-taint` (#7) + `referent` (#15) — три P1/P2
   грани одной ценностной пары, все с дешёвым C относительно риска, ни одна не начата в коде.
3. **Один owner-вопрос**: folder-in-folder-restructuring (#4, C=1 — буквально «спросить первым»).
4. **Ратифицировать `act-kinds.design.md`** ADR-ом — код (`types.ts`) уже опережает канон-статус
   (найдено волной 1, §3 п.3 этого файла) — дешёвая гигиена, снимает будущие рассинхроны.
5. **Не путать `cost-tree` с покрытием Витальности** ни в одном будущем докладе владельцу — соседний
   измерительный примитив, не механизм; 6/6 граней Ц4 остаются на глубине 1 до отдельного движка.

## 9. Где карта шаткая (честно, из самих coverage-файлов)

- `packages/engine/src/adapters/`, `surface/` (кроме `cli.ts`) и всё вне `engine/` не прогреплены
  построчно — часть designed-only граней (`foreign-residence`, `composition-and-emergence`,
  `polysemy-lens`) могла получить частичный код там, не найденный.
- V/R/C/Rdy — экспертные баллы агентов волны 2, не ратифицированы владельцем; расхождение во мнении
  сдвинет Priority, но не бакет P0/P1 (запас большой у топ-7).
- Граница термина «линза» (строго 3 vs широко 9) НЕ решена каноном — влияет на §6 этого файла и на
  оценку глубины `polysemy-lens`/`customer-lens.ts` (оценено консервативно, реальное значение может
  быть на 1 глубже).
