---
node_type: analysis
title: "Реестр конфликт-пар граней, факторизованный через lossy-механизмы (C0)"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
refines:
  - ./09-fable-verdict-unit-of-green.synthesis.md
related:
  - ./06-green-conditions-model.analysis.md
  - ./01-building-blocks.analysis.md
  - ./00-COVERAGE-MAP.synthesis.md
  - ./coverage/03-readability-identity.coverage.md
  - ./coverage/04-trust-vitality.coverage.md
  - ./coverage/05-sovereignty-relationality-consent.coverage.md
source:
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/idempotency.ts
  - packages/engine/src/core/erasure.ts
  - packages/engine/src/core/view-compiler.ts
  - packages/engine/src/core/admission.ts
  - packages/ingest-rentacar/src/dedup/candidates.ts
  - packages/ingest-rentacar/src/dedup/same-as-writer.ts
  - packages/ingest-rentacar/src/lens/customer-lens.ts
  - packages/ingest-rentacar/src/observation/latest-wins.ts
  - packages/ingest-rentacar/src/predicates.ts
---

# Реестр конфликт-пар — C0 направления N-G

> Задача C0 (вердикт Fable, `09-fable-verdict-unit-of-green.synthesis.md` §"Дизайн волн C"): построить
> реестр конфликт-пар граней ДО фан-аута C1/C2, факторизованный через lossy-механизмы, а не через
> абстрактную «пару ценностей». Метод: для каждого механизма в `packages/engine/src/core/*` и
> `packages/ingest-rentacar/src/*` — что он схлопывает (lossy-что), designed/shipped статус (код=истина),
> какие грани делят его как противоположные множества отказов, и контрподпись (один состязательный тест,
> засчитываемый обеим граням).

## Таблица

| # | Механизм | Lossy-что (что схлопывает) | designed/shipped | Грань-A теряет | Грань-B требует | Ценности | Состязательный тест (контрподпись) | Приоритет |
|---|---|---|---|---|---|---|---|---|
| M1a | **same-as dedup fold** (`predicates.ts` `LOCKED_MANY_PREDICATES['same-as']` + `same-as-writer.ts` + `candidates.ts`) | Read-side (`customer-lens`) сворачивает N кандидат-узлов в ОДИН читаемый кластер идентичности; edge остаётся (реверсивно), но у lens нет предохранителя от намеренно различных сиблингов | **SHIPPED** (ga-rentacar M2: 32/32 теста; продукт-проводка M3 отложена, коммит `a02f759`) | Тождество/03 vetvleniye-i-varianty (граница «руки прочь от вариантов» не реализована) | Тождество/01 kriteriy-i-dedup (сам механизм, уже green-unit) | Ц2↔Ц2 (внутри Тождества, разные грани) | Два узла с одинаковым phone+name, но явно помеченные как разные сущности (напр. отец/сын) → после confirm+customer-lens read система обязана показать 2 разные сущности ЛИБО явно потребовать human-override-флаг, не тихо унифицировать | **P0 (живой риск)** — сам facet-doc 01 называет это P1-риском именно потому, что 01 уже shipped |
| M1b | same-as dedup fold (тот же механизм) | Слияние идентичности может незаметно объединить владение/грант-поверхность двух узлов с разными owner/capability | SHIPPED (см. M1a) | Тождество/01 kriteriy-i-dedup | Суверенность/05 ownership-keys (green-unit, `capability.test.ts`) | Ц2↔Ц5 | Смёрджить два узла, у которых РАЗНЫЕ активные grant/capability → confirm-merge не должен молча расширять held-capability объединённого кластера сверх пересечения; тест на held-capability ДО/ПОСЛЕ merge | P1 |
| M2a | **latest-wins reducer** (`observation/latest-wins.ts`) | Несколько `observation`-актов по одному ключу схлопываются в ОДИН «current» ответ по позиции в журнале; проигравшие сохраняются, но конфликт не виден третьей стороне | SHIPPED (8 тестов, `@ff/ingest-rentacar`; экспорт помечен «M3-deferred wiring» в `index.ts:39`) | Тождество/05 koreferenciya-i-konflikt (спор не становится видимым третьему) | Доверие/02 calibration (confidence должен пересчитываться байесовски по МНОЖЕСТВУ наблюдений, не по одному победителю) | Ц2↔Ц3 | Подать 2 конфликтующих `observation`-акта на один ключ → «current»-ответ обязан либо нести флаг конфликта (закрывает Ц2/05), либо иметь понижeнный confidence пропорционально разногласию (закрывает Ц3/02) — один фикстур-тест засчитывает обе грани | P1 |
| M2b | latest-wins reducer (тот же механизм) | Победитель определяется ПОЗИЦИЕЙ в журнале, не `recordedAt` («wall-clock can go backwards under NTP/multi-writer skew», комментарий в коде) | SHIPPED (см. M2a) | Тождество/05 koreferenciya-i-konflikt | Доверие/05 concurrency-zombie (гонка записи, «зомби»-факт побеждает) | Ц2↔Ц3 | Инжектировать 2 акта, где журнал-позиция ОБРАТНА реальному `recordedAt` (симуляция скью часов) → проверить, что «current» не выдаёт более старый факт как окончательный без explicit disagreement-сигнала | P2 |
| M3a | **`one`-cardinality replace fold** (`predicates.ts` `foldEdges` ветка `one`; тенант-реестр `RENTACAR_PREDICATES` — `rented`/`drives`/`paid-against`/`for-car`/`for-customer`, все `'one'`) | Новый акт по предикату REPLACE-схлопывает прежний edge того же предиката; при этом ДВЕ РАЗНЫЕ keyspace-строки (`rented` vs `for-customer`) кодируют один и тот же концептуальный факт «клиент заказа» — правка в одной НЕ трогает другую | **SHIPPED** (`packages/ingest-rentacar/src/predicates.ts`, продукт ga-rentacar M1/M2; сам P0 задокументирован в шапке `customer-lens.ts` как известный риск) | Тождество/01 kriteriy-i-dedup («кто ЕДИНСТВЕННЫЙ клиент заказа» — фрагментируется на 2 непересекающихся keyspace) | Доверие/04 supersession-audit (правка в одном keyspace не оставляет следа противоречия с другим — тихая развилка правды) | Ц2↔Ц3 | Записать заказ `rented→A`, затем корректирующий акт `for-customer→B` (тот же заказ, другой keyspace) → `customer-lens` СЕЙЧАС молча объединяет оба как непротиворечивые (найдено чтением кода) — тест обязан заставить lens либо пометить конфликт явно, либо engine отказать второй записи до унификации keyspace | **P0 (уже задокументированный риск в самом коде, не гипотеза)** |
| M4a | **write-time idempotency hash collapse** (`idempotency.ts`, kernel R5: `sha256` по `source_ref+actKind+payload+edges`, БЕЗ `id`/`recordedAt`/`actor`) | Два акта с байт-идентичным содержимым схлопываются в один no-op write — второй акт исчезает из журнала целиком (не просто поле) | SHIPPED (kernel, ядро; сам `same-as-writer.ts` комментирует это как операционный риск, требующий `seq`-обхода) | Тождество/06 dvizhkovyy-dolg (позиционный порядок = единственный контракт различимости событий; повтор без `seq` теряет само событие «актор подтвердил ЕЩЁ РАЗ») | Доверие/04 supersession-audit (аудит ожидает одну строку на реальное событие записи; content-collapse создаёт незаметный провал — «было ли это записано дважды или один раз» не восстановить из журнала) | Ц2↔Ц3 | Два независимых write-вызова с байт-идентичными content-полями, но разным реальным намерением («перепроверил и подтвердил снова») БЕЗ явного `seq` → explain-chain (T-7) обязан отличить «схлопнуто как no-op» от «было единственное событие», либо write обязан вернуть explicit сигнал «уже существует» вызывающему | P1 |
| M5a | **erasure/shred seam** (`erasure.ts` `splitAct`/`redactAct`/`isErasureVerifiable`) | Полное удаление payload (будущий hard-erase) оставляет только meta+hash-свидетеля; содержимое невосстановимо по конструкции | **DESIGNED-ONLY** (сам код: «Shape-level only; NOT the feature»; WHERE payload физически живёт — не решено, критично отложенный owner-fork) | Согласие/05 revocation-erasure (нужно РЕАЛЬНОЕ забвение) | Доверие/01 provenance + Доверие/04 supersession-audit (нужен след «что произошло», не восстановление контента, но факт события) | Ц7↔Ц3 | Стереть payload → (a) попытка реконструировать контент из meta+hash ДОЛЖНА провалиться (приватность), (b) аудитор ДОЛЖЕН подтвердить факт/время/актора стирания БЕЗ контента (аудит) — одна фикстура, два ассерта, закрывает обе грани разом | P2 (заблокировано owner-развилкой «где физически живёт payload», критично для КQ-8) |
| M5b | erasure/shred seam (тот же механизм) | Кто МОЖЕТ инициировать стирание чужого referent-узла — carve-out не ратифицирован | DESIGNED-ONLY, «PENDING carve-out» в `invariants.md` | Согласие/06 custodial-override (кто санкционирует erasure над волей владельца) | Суверенность/06 constitutional-ceiling (green-unit clamp — но не покрывает ИМЕННО erasure-carve-out случай) | Ц7↔Ц5 | Custodian запрашивает hard-erase референт-узла ПРОТИВ явно выраженной policy referent-владельца → система обязана детерминированно решить, чья воля побеждает (сейчас нет ответа: ни ratified carve-out, ни явный deny) | P2 (упирается в решение ТОЛЬКО владельца, §«🔴» в 09-вердикте) |
| M6a | **archival tombstone-flip** (`projection.ts` `payload.archived → state.tombstone`) БЕЗ каскада на рёбра (0 совпадений cascade-кода) | Узел получает tombstone, но живые рёбра, указывающие НА него, остаются нетронутыми — «висящая» ссылка на архивный узел выглядит для наивного консьюмера как живая | **SHIPPED** (tombstone-flip) / **ОТСУТСТВУЕТ** (cascade-часть — 0 кода нигде) — механизм наполовину не существует | Реляционность/02 typed-edges-and-cascade (грань требует явный cascade-контракт при удалении узла) | Доверие (провенанс-честность: потребитель ребра должен УЗНАТЬ, что цель — tombstone, без ручной проверки на каждом чтении) | Ц6↔Ц3 | Архивировать узел, на который есть 3 живых ребра из разных узлов → любой read-lens, следующий по этим рёбрам, обязан явно сигнализировать «цель tombstoned», а не молча отдать последний известный снапшот как актуальный | P2 |
| M6b | archival tombstone-flip (тот же механизм, прогноз на будущий cascade) | Если cascade будет реализован буквально (снос/orphan рёбер при архивации родителя) — это схлопнёт композитные дочерние узлы, у которых может быть самостоятельная жизнь | ОТСУТСТВУЕТ в коде (чисто прогностическая пара — включена, т.к. Fable явно называет её эталонным примером) | Реляционность/02 typed-edges-and-cascade | Реляционность/05 composition-and-emergence (дочерний/производный узел может пережить архивацию родителя) | Ц6↔Ц6 (внутри Реляционности, разные грани) | Архивировать родителя с 2 дочерними composite-узлами → cascade-реализация обязана либо явно спросить/полиси-решить судьбу детей, либо гарантированно НЕ трогать их state, только рёбра-ссылки | P3 (механизм ещё не существует — дешёво зафиксировать контракт ДО первой реализации) |
| M7a | **aggregation/rollup lens** (`view-compiler.ts` `costTree`/`rollup`/`grandchildSum`) | Суммирует числовое поле по поддереву в ОДНО число; per-node провенанс вклада теряется в контракте `ViewResult` (только `treeIds()`-debug-хелпер, не часть обычного ответа) | **SHIPPED, green-product** (гейтится `resolve('read', …)` под FIXED-policy — I-7 применён на чтение) | Согласие/04 consent-taint (read-гейт есть, НО taint-наследование use-уровня отсутствует — сумма не несёт метку «включает use-restricted вклад») | Доверие/01 provenance (агрегат не объясним обратно к исходным measurement-снапшотам в обычном контракте) | Ц7↔Ц3 | Ветка поддерева READ-видима вьюеру, но помечена use-restricted (напр. производная от финансового документа с ограничением использования) → возвращаемая сумма ОБЯЗАНА либо исключить вклад ветки, либо сама нести taint-метку для этого вьюера — один фикстур-тест закрывает и consent-taint, и provenance-прослеживаемость | **P1** (топ-дыра карты покрытия, Ц7/04 = Priority 30) |
| M7b | aggregation/rollup lens (тот же механизм) | `sum`-агрегация НЕ реализует ни один из 6 механизмов Витальности (decay/consolidation/forgetting/…) — сосед-грань ошибочно засчитывалась инвентарём как покрытие | SHIPPED (см. M7a) | Витальность/06 metabolism-governance (ошибочно засчитанное покрытие) | (нет второй грани-конфликта — это НЕ конфликт двух граней, это ложное покрытие одной) | Ц4 (внутри одной ценности) | *Исключено из пар* — это не конфликт механизма, а ошибка scoring волны 1/2 (уже исправлена в `00-COVERAGE-MAP` §5); упомянуто для полноты, не считается парой |
| M8a | **visibility inherit-on-silence fold** (`projection.ts`: superseding-акт без `readable_by` СОХРАНЯЕТ прежнюю видимость, не сбрасывает к default-deny) | Молчание трактуется как «без мнения → унаследовать», а не «сбросить» — супersede, забывший заявить `readable_by`, НЕ сужает доступ, даже если автор ожидал лока | **SHIPPED** (kernel `projection.ts`, базовый reducer) | Согласие/02 visibility (риск случайной over-exposure: узел, ставший чувствительным, остаётся широко читаемым, пока никто явно не заявит новую видимость) | Суверенность/02 policy-as-data (нужна прослеживаемость: КАКОЙ акт последний РЕАЛЬНО решил текущую видимость — при inherit-by-silence это не последний акт, а более ранний, скрытый в истории) | Ц7↔Ц5 | Supersede, меняющий тело узла на явно более чувствительное, БЕЗ повторного заявления `readable_by` → система обязана либо потребовать явного повторного заявления при материальном изменении тела, либо явно доказать, что унаследованная видимость всё ещё соответствует политике — тест ловит «тихий leak по умолчанию» | P1 |

## Механизмы, помеченные как «неясно lossy ли» (не включены в пары — честно, не выдумываю)

1. **`admission.ts` `admitHome()` / one-home barrier (GAP 3c)** — REFUSAL-гейт (отказ записи из «не-домашнего» writer-домена), а не FOLD, схлопывающий несколько входов в один. Он скорее ПРЕДОТВРАЩАЕТ потерю (защищает единственность источника правды на factKind), чем порождает её. Возможная теневая лоссовость: легитимная вторичная запись от другого домена отбрасывается целиком (никогда не попадает в журнал) — это ближе к M4 (idempotency collapse) по духу, но fail-loud (возвращает `Admission`-проблему), а не silent no-op. Не строю пару без более глубокого чтения `admission.ts` целиком — флагую для C2, когда агент этого механизма прочтёт файл построчно.
2. **`predicates.ts` `assertForwardMonotone`** — это ГВАРД ПРОТИВ лоссовости (запрещает `many→one` narrowing), не сам лоссовый редьюсер. Формально не конфликт-генератор; включён в инвентарь механизмов только для полноты (Fable: «чисто аддитивные редьюсеры пар не рождают» — этот вообще не редьюсер данных, а pre-flight проверка).

## Сводка

- **Механизмов найдено в коде и оценено: 10** (8 firm lossy-редьюсеров с парами M1-M8, где M6/M7b — пограничные/исключённые из счёта пар; + 2 flagged unclear, не давшие пар).
- **Пар всего: 15** (M1a, M1b, M2a, M2b, M3a, M4a, M5a, M5b, M6a, M6b, M7a, M8a = 12 полноценных + M7b исключена явно как ложное покрытие, не пара). Итого **12 реальных конфликт-пар**, в диапазоне прогноза Fable (10-20).
- **Shipped-механизмы (живые лжи по Fable — S2 без S3, приоритет C2):**
  1. **M1 same-as dedup fold** (ga-rentacar) — пары: вариант-поедание (P0), owner-merge (P1)
  2. **M2 latest-wins reducer** (ga-rentacar, M3-wiring deferred) — пары: calibration (P1), concurrency-zombie (P2)
  3. **M3 `one`-cardinality replace + keyspace fragmentation** (RENTACAR_PREDICATES, продукт M1/M2) — пара: identity-fragmentation × supersession-audit — **P0, уже задокументированный риск в самом коде** (`customer-lens.ts` header)
  4. **M4 write-time idempotency hash collapse** (kernel R5) — пара: journal-uniqueness × audit-completeness (P1)
  5. **M6 archival tombstone-flip** (kernel, cascade-половина отсутствует) — пара: dangling-reference × cascade-contract (P2)
  6. **M7 aggregation/rollup lens `cost-tree`** (kernel, green-product) — пара: consent-taint × provenance-traceability — **P1, топ-дыра карты покрытия**
  7. **M8 visibility inherit-on-silence fold** (kernel) — пара: silent-leak × policy-traceability (P1)
  Итого **7 из 8 механизмов уже SHIPPED без S3-закалки** — только M5 (erasure seam) чисто designed-only. Это ГОРАЗДО шире, чем единичный пример `kriteriy-i-dedup` из карты покрытия волны 1-2: почти вся lossy-поверхность движка уже в проде без состязательного теста.
- **Порядок для C2** (по вердикту Fable — shipped первыми, один агент на механизм, не на пару):
  1. M3 (one-cardinality replace / keyspace fragmentation) — P0, риск уже в коде-комментариях продукта
  2. M1 (same-as dedup) — P0/P1, второй по свежести факт-паттерн (dedup + variants + ownership)
  3. M7 (aggregation/cost-tree) — P1, топ-дыра карты покрытия (consent-taint=30)
  4. M8 (visibility inherit-on-silence) — P1, security-релевантно
  5. M4 (idempotency hash collapse) — P1
  6. M2 (latest-wins) — P1/P2
  7. M6 (archival tombstone / cascade) — P2, но дёшево — контракт лучше зафиксировать ДО первой cascade-реализации
  8. M5 (erasure seam) — P2, но заблокирован owner-развилкой (payload-residency), решать после КQ-8

## Где реестр шаткий (честно)

- Не прочитан `admission.ts` целиком построчно (только grep-фрагменты) — one-home barrier мог бы дать 1-2 дополнительные пары, если внимательнее вчитаться в его взаимодействие с M3 (одна и та же природа: writer-home vs keyspace-split).
- `packages/engine/src/adapters/store-durable-fs.ts` и `runner/durable-runner.ts` (S7 durable-store tail, недавно сданный по коммиту `490d5bb`) НЕ проверены на предмет собственного lossy-механизма (напр. tail-drop журнала при crash-recovery, упомянутый в задании как кандидат) — это отдельный, ещё не прочитанный источник lossy-поверхности; кандидат на 11-й механизм, если C2 найдёт его при построчном чтении.
- Приоритеты (P0-P3) в этом реестре — моя экспертная оценка по аналогии с рубрикой `02-values-lenses-acts-frame.analysis.md`, не пересчитаны формулой Priority=(V×G×R×Rdy)/C и не ратифицированы владельцем.
