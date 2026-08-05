---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-04
Scope: project
node_type: analysis
title: "Census — ga-rentacar (первый реальный жилец FF): где лежит вся информация"
Related:
  - ../../../03-projects/ga-rentacar/INDEX.md
  - ../../../03-projects/ga-rentacar/_inbox/HANDOFF-2026-08-04-wave-synthesis.md
  - ../../../03-projects/ga-rentacar/analyses/13-post-m2-review-and-m3-gap.analysis.md
---

# Census — ga-rentacar

> Фаза DESIGN, не код. Карта домов, не пересказ. Верификация: `npx vitest run` в
> `packages/ingest-rentacar` (32/32 green), `packages/rental-balance` (не прогонялся в этой сессии,
> но упомянут 9/9 в STATE.md исторически), `packages/engine` (92/92 green, 15 файлов).

## Таблица домов

| Локация | Что | Тип | Зрелость | Служит | Свежесть/дрейф |
|---|---|---|---|---|---|
| `docs/03-projects/ga-rentacar/INDEX.md` | Навигатор проекта, статус-таблица по всем трекам | nav | active | ориентация | обновлён 2026-08-04, актуален |
| `ga-rentacar.concept.json` | attention-list визард (устаревший, 2026-07-25) | wizard | active | навигация S1-S5 | **дрейф**: не знает про волну 08-04 (форки/ценности/spine) |
| `_inbox/owner-decisions-2026-08-04.concept.json` | decision-wizard S0-S9 по всем owner-решениям волны | wizard | draft | сборка решений | свежий, это и есть актуальный вход |
| `_inbox/HANDOFF-2026-08-04-wave-synthesis.md` | Свод волны 6 команд: ценности+форки+spine+timeliness | handoff | active, Maturity 75% | единый вход в текущее состояние | **самый свежий**, `Supersedes-context` над forks-and-values |
| `_inbox/HANDOFF-2026-08-04-forks-and-values.md` | Вход волны (предыдущий handoff) | handoff | active, Maturity 80% | контекст до волны | superseded свежим сводом, но не архивирован статусом |
| `decisions/01-direction-and-mvp.decision.md` | D1-D6: узкий вертикальный срез, Sheets=истина, ABAC отложен | decision | **approved** | MVP-границы | стабильно, не дрейфует |
| `decisions/02-topic-config-and-sessions.decision.md` | D7-D10: процесс=конфиг топика | decision | approved | процесс | стабильно |
| `decisions/03-vertical-and-signoffs.decision.md` | Q1 решён: пивот B (клиентская линза), деньги парковались | decision | approved | вертикаль M2→M3 | стабильно |
| `decisions/04-node-identity-canonicalId.adr-draft.md` | canonicalId ADR-черновик | adr-draft | 🔴 **FLAWED** (критик) | identity | обоснование на неверном чтении кода — не ратифицировать как есть |
| `decisions/05-groupA-identity-engine.decision.md` | Группа A: отложить canonicalId + лёгкий read-path | decision | draft | identity-минимализм | переосмыслен через коронный инвариант (STATE.md), статус остался draft (LOSE-NOTHING) |
| `decisions/06-groupB-data-pii.decision.md` | Группа B: паспорт узла + PII-стратегия | decision | draft | passport/PII | то же — переосмыслен, draft |
| `_inbox/ADR-DRAFT-resolve-ceiling-symmetry.decision.md` (F-5/R8) | write=prefix-gated / read=exact ceiling ратификация | adr-draft | **proposed, Maturity 88%, GREEN 7/7** | PEP-легибилити | ждёт owner: proposed→approved |
| `_inbox/F-3-one-home-and-homeregistry.decision.md` | one-home barrier + real wiring | decision | draft, Maturity 70% | Фин.целостность/Целостность актива/Контроль риска | ждёт owner: fail-open vs fail-closed; wiring-часть готова к «строй» без гейта |
| `_inbox/F-4-rented-vs-for-customer.decision.md` | keyspace-раскол rented↔for-customer | decision | draft, Maturity 75% | целостность read-плана | рекомендация B (два факта) укреплена; allow-list капабилити СПЕЦИФИЦИРОВАНА, не построена |
| `_inbox/timeliness-engine-bridge.design.md` (T5) | Своевременность/Оперправда → движок (clock-порт, TimelinessEvaluator) | design | draft, Maturity 58%, кандидат ADR-0005 | ценность #3/#5 | зависит от 4 неотвеченных развилок + ещё не построенного spine |
| `_inbox/values-v2/VALUES-canon-v3.idea.md` | 7 ценностей company-first, метрики, 5 развилок | idea | draft (business-analyst) | canon ценностей | конфликтует с critique по #3, #5, #7 |
| `_inbox/values-v2/VALUES-critique.analysis.md` | red-team ценностей v3 | analysis | draft (critic) | стресс-тест canon | нашёл асимметрию #5, отсутствие tie-break, 3 скрытые ценности |
| `_inbox/wave-review-engine.analysis.md` | вычитка кода spine после волны | analysis | active | quality gate | нашла и зафиксировала CRITICAL-регресс (см. риски) |
| `_inbox/wave-review-docs.analysis.md` | консистентность доков волны | analysis | active | quality gate | подтвердил grounding F-4, отметил дрейф STATE.md |
| `_inbox/wave-review-adversarial.analysis.md` | адверсариальный проход | analysis | active | quality gate | не прочитан построчно в этой сессии — not-read |
| `specs/01-ingest-slice.spec.md` | паспорт + idem-upsert + тест-план (1 стр.) | spec | draft, написан до CQRS-языка | ingest MVP | STATE.md отмечает: написан «на до-CQRS языке», нужна сверка |
| `specs/04-m2-dedup-and-customer-lens.spec.md` | AC1-AC8 M2: same-as + customer-lens | spec | draft, REVISE (D5 авто-слияние убрать) | M2 гейт | **AC5/T3 не реализован** — линза не обходит same-as (см. риски) |
| `specs/05-m3-topic-agent-contract.spec.md` | M3 живой топик-агент (паттерн balance-observer) | spec | draft, REVISE | M3 гейт | предусловия P0-P14 переоценены в analyses/13 — таблица спека на 3 дня отстала |
| `specs/06-m2-build-steps.spec.md` | build-steps M2 после критики | spec | draft | M2 сборка | «M2 засчитан, если T2+T3 зелёные» — T3 красный ⇒ M2 не засчитан |
| `specs/07-durable-storeport.spec.md` | контракт durable store | spec | draft→**built-green** | durable substrate | реализован (`store-durable-fs.ts`), 15 test-файлов engine зелёные |
| `analyses/01-data-and-dedup-risks.analysis.md` | Топ-3 риска: дедуп людей, версии/tombstone, «неделя»-иллюзия | analysis | 🟢 зафиксировано | границы MVP | стабильно, не дрейфует |
| `analyses/04-real-data-grounding.analysis.md` | Orders=4102, ~2000-2700 клиентов, ~15-25% дублей | analysis | draft | грунт на реальных данных | цифры из живых Sheets, ключевой источник масштаба риска |
| `analyses/13-post-m2-review-and-m3-gap.analysis.md` | R1-R8 косяки построчно (code+test), owner-гейты сведены | analysis | draft, **самый плотный источник** | честная картина M2 | central: "M2 НЕ закончен вопреки баннеру коммита" |
| `packages/ingest-rentacar/src/` | sync Orders/Cars/Customers, dedup candidates, customer-lens, latest-wins | код | **built-green, 32/32 test** | синк = источник данных ядра | линза читает `graph.byId` напрямую, минует PEP (R3); не обходит same-as (R2) |
| `packages/rental-balance/src/` | balance-observer, payment reduce, CLI | код | built (тесты не прогнаны в этой сессии) | деньги-вертикаль | единственный писатель `for-customer`/`payment`, де-факто не канонизирован (F-3) |
| `packages/engine/src/core/{admission,idempotency,resolve}.ts` | one-home PEP, content-hash dedup, Constitution ceiling | код (ядро, не ga-rentacar, но driven ИМ) | **built-green, 92/92 test** | write-plane invariants | admission fail-open при отсутствующем `domain` (R4); resolve prefix/exact асимметрия ратифицирована как (c) |
| `packages/engine/src/runner/durable-runner.ts` | P2 durable-раннер, survive-restart | код | **built-green** (новый в этой волне) | M3 raннер | ни один M2/M3-модуль пока НЕ гоняется на нём — всё на MemoryStore |

## Построено vs дизайн

**Реально построено и зелёное (код+тесты):**
- `ingest-rentacar` — sync Orders/Cars/Customers, hash/keys/reduce, dedup candidates + same-as writer, customer-lens, latest-wins observation: 32/32 теста, изолированные модули.
- `rental-balance` — balance.ts, balance-observer агент, CLI-поверхность, payment reduce.
- `engine` core — admission (one-home), idempotency (content-hash, P1 этой волны), resolve (PEP, F-5 gated-зажим), durable-fs store (C1-C5), durable-runner (P2 этой волны, survive-restart): 92/92 теста, 15 test-файлов включая crash-mid-turn (SIGKILL), durable-reboot-matrix.

**Дизайн/draft (бумага, не код):**
- Ценности company-first v2/v3 — canon не ратифицирован, 4 owner-развилки (в т.ч. КОНФЛИКТ #3 своевременность BA vs critic).
- Timeliness-engine bridge (T5) — design 58%, кандидат ADR-0005, зависит от F-3 fail-open/closed.
- F-4 multi-domain allow-list — capability СПЕЦИФИЦИРОВАНА (инварианты INV-1..5, точка приземления `admission.ts:118`), но diff не написан.
- specs/01,04,05 — draft/REVISE, M2 не засчитан по собственному гейту спека (T3/AC5 красный).

**Ключевой разрыв "построено ≠ подключено" (analyses/13):** три M2-слайса (dedup, customer-lens, latest-wins) зелёные ИЗОЛИРОВАННО, но не образуют конвейер — линза не читает `same-as`-кластер, минует PEP, не работает поверх durable-store. M2 НЕ закончен вопреки баннеру коммита "M2 slices".

## Живые риски в проде

1. **R2/R3 (analyses/13, `customer-lens.ts:94`/нет `resolve()`)** — линза не обходит `same-as` (дубль-кластер из 3 клиентов вернёт заказы только одного узла) И читает `graph.byId` напрямую мимо PEP (агент увидит неавторизованные узлы). Оба — high severity, некритичного теста нет.
2. **F-4 keyspace-раскол `rented`/`drives` (sheets) ↔ `for-customer`/`for-car` (rental-balance)** — два живых писателя на структурно-идентичные edges без общего join-ключа (`sheets:Orders#<numCore>` regex vs `rentacar.onecar:Order#<key>` свободный текст); форс-merge без ключа = риск ложной денежной привязки. Источник: `F-4-rented-vs-for-customer.decision.md`, grounding подтверждён построчно.
3. **F-3 one-home barrier fail-open** (`admission.ts:110-124`) — барьер отступает, если ЛЮБОЕ из трёх полей (registry/fact_kind/domain) отсутствует; сегодня НИ ОДИН `cli.ts` не инжектит `HomeRegistry`, ни один writer не проставляет `provenance.fact_kind`/`domain` → механизм построен, но no-op в проде. Источник: `F-3-one-home-and-homeregistry.decision.md:20-31`.
4. **R1 GAP-3(a) forward-monotone guard не вызывается нигде в реальном пути** (`predicates.ts:78`, 0 не-тестовых вызовов) — сужение `many→one` на rebuild/reboot молча схлопывает историю; ярлык "realized green" в доках вводит в заблуждение.
5. **CRITICAL-регресс, НАЙДЕН И ПОЧИНЕН в этой же волне** (не открытый риск, но показателен): новый content-hash dedup (P1) молча превращал владельческий re-merge в no-op — dedup сканировал всю историю и цеплял superseded-акт; `engine` тесты (91/91 на момент бага) не ловили это, потому что `ingest-rentacar` тянет engine через устаревший `dist/`. Урок про drift между `src`/`dist` в монорепе.

## Owner-решения в очереди (сведено HANDOFF wave-synthesis)

Ценности: #3 своевременность (ценность vs сквозное требование, BA vs critic) · #7 усиление→Constraints/ADR · добавить скрытые ценности (ликвидность/дисциплина-агента/репутация) · нужна ли иерархия/tie-break. Форки: F-3 fail-open/closed + ратификация payment-дома · F-4 один ли это реальный заказ + строить allow-list сейчас · F-5 утвердить (c) → ADR approved. Движок: D2 timeliness — свип-триггер lazy+on-ingest ok? Плюс F-5 отдельно требует явного privilege-change подтверждения (держатель `core:manage-core` получает право писать в сам PEP-комбинатор — ADR framing этого не называет).

## Чему ga-rentacar учит ядро (жилец → субстрат)

1. **Идентичность людей не решается одним сигналом.** Телефон=SIM не человек, транслит-имена нестабильны, `same-as` не транзитивен наивно → ядро получило требование "ребро несёт паспорт (уверенность/происхождение/время)", не только узел (D6, `analyses/01`).
2. **PEP должен быть ЕДИНСТВЕННОЙ дверью, а не opt-in паттерном.** `customer-lens` показал, что модуль можно построить и протестировать зелёным, полностью обойдя `resolve()` — это системный риск для любого будущего жильца, не только ga-rentacar (R3, analyses/13).
3. **One-home барьер и multi-domain реальность conflict.** Два живых писателя на один concept (order→customer edge) без ratified join-ключа — заставило ядро специфицировать `HomeRegistry.homes: Domain | Domain[]` allow-list вместо предположения "1 factKind = 1 дом" (F-4 capability spec, INV-1..5).
4. **Время как недетерминированный вход — несущий инвариант, не деталь.** Timeliness bridge (T5) явно формулирует: `now` входит ТОЛЬКО через clock-порт на границе оценки, никогда в редьюсер — иначе event-sourced проекция теряет воспроизводимость. Это кандидат в ADR-0005 "Temporal plane" для ядра, рождённый именно из нужд ga-rentacar (сроки ТО/страховки/просрочка).

## Дыры карты

- `_inbox/wave-review-adversarial.analysis.md` — **not-read** в этой сессии (только упомянут); может содержать доп. риски.
- `packages/rental-balance` тесты не прогонялись в этой сессии (исторический счёт 9/9 из STATE.md, не верифицирован заново); `PayloadStore` интерфейс — по признанию analyses/13 §5, "не прочитан этой парой" вообще, от него зависит V7-enforcement (право на забвение) — заведомая слепая зона.

Путь: `docs/_inbox/2026-08-04-assemble-and-direct/census/02-ga-rentacar.census.md`
