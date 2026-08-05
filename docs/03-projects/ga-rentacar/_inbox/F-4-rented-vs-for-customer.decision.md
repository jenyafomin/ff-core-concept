---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
Scope: project
node_type: decision
title: "F-4 — 'rented' vs 'for-customer': unify write-side or ratify as two permanent facts"
Related:
  - ../analyses/13-post-m2-review-and-m3-gap.analysis.md
Maturity: 75% (T2 углубление 2026-08-04) — центральный вопрос разобран по 4 осям (целостность/риск потери/сложность резолва/покрытие ценностей) для обоих сценариев; рекомендация B укреплена новым обоснованием (нет надёжного join-ключа между источниками СЕГОДНЯ + вариант A скрыто зависит от F-2); capability "multi-domain allow-list" теперь СПЕЦИФИЦИРОВАНА (инварианты, типы, точка приземления в коде) — форк переведён из "рекомендация висит в воздухе" в "есть план реализации". НЕ закрыто: owner-факт "один ли это реальный заказ" остаётся открытым (см. "Решение 2026-08-04"); код не написан (DESIGN-фаза).

# F-4 — rented vs for-customer

> Note: this fork was originally drafted as "F-1" and collided with the canonical F-1 (V7, erasable
> payload) in `docs/_inbox/2026-08-03-owner-forks-root-seal.md`. It is a **different, new fork** →
> renumbered to **F-4** (2026-08-04). Don't conflate with the canonical F-1 (V7).

## Развилка

`customer-lens.ts:9-20` unions two predicate keyspaces on read because two **live, separate writers**
emit structurally-identical order→customer/car edges under different names:
- `ingest-rentacar/core/reduce.ts:99-100` — `rented`/`drives`, on `sheets:Orders#<numCore>` nodes.
- `rental-balance/core/reduce.ts:70-71` — `for-customer`/`for-car`, on `rentacar.onecar:Order#<key>` nodes.

**New grounding fact (corrects the lens comment):** `for-customer` is not a stale TODO — `rental-balance`
is a real, separate package that writes it today. Node namespaces are disjoint (no node holds both edges
yet), but the predicate registry is already shared: both pairs live in ONE file,
`ingest-rentacar/predicates.ts:19-25`, both `'one'`-cardinality. Neither writer sets
`provenance.fact_kind`/`domain` (admission.ts:110-124), so the one-home barrier (GAP 3c) is a no-op here —
it can't distinguish these as "same fact, two homes" today.

## Variant A — unify write-side (one predicate)

Touches **two packages**, not one file: both reducers must converge on one predicate pair, plus a
migration story for acts already journaled under the other name (append-only — old acts can't be
rewritten, GAP 3a forward-monotone guard blocks narrowing). Loses the implicit provenance signal the
predicate name currently carries ("this edge came from Sheets ingest" vs "payment vertical") unless
`provenance.domain` is populated instead. Bigger blast radius than the fork brief assumed.

## Variant B — ratify as two permanent facts

No migration, no cross-package touch — codifies current reality. Cost lands on every future reader: each
new lens/join must remember BOTH predicate names or silently under-return (exactly the P0 the lens header
warns about). Weakens agent-first legibility (an agent asking "what predicate is order→customer" has no
single answer). The one-home barrier stays structurally toothless for this shape unless explicitly given a
multi-domain allow-list mode — which doesn't exist in `HomeRegistry` today (it's factKind→ONE domain).

## Адверсариальная самопроверка

- Against A: if the two "orders" are permanently disjoint tenants (sheets-real vs payment-vertical
  fixture), forcing one predicate name conflates two different provenances for no data-integrity gain.
- Against B: "read-side union" is a tax that compounds — every new lens (fines-join, M3 topic agent,
  future balance merge) must carry the same two-name list or reproduce the exact bug the comment warns
  about. Formalizing B needs new engine capability (multi-home allow-list) that isn't built.
- Neither variant is free; the deciding fact is **whether sheets-orders and payment-vertical-orders will
  ever be the same real-world order** (future merge) — that answer isn't in the code.

## Рекомендация

Lean **B for now, with a mandatory registry declaration** (not silent tolerance): both writers set
`provenance.fact_kind='order-customer-edge'` + their own `domain`; extend `HomeRegistry` to accept an
explicit allow-list of homes per factKind (new, small capability) so a THIRD accidental writer is still
caught. Defer A unless the owner confirms the two order sources are meant to converge.

## Открытые вопросы владельцу

1. Will `sheets:Orders#...` and `rentacar.onecar:Order#...` ever represent the same real-world order
   (eventual merge), or are they permanently separate tenants/fixtures?
2. Is `HomeRegistry` multi-domain allow-list worth building now, or defer until a real third-writer risk appears?
3. If A is eventually chosen, which predicate name wins — `rented`/`drives` (sheets, PII-bearing, real data) or `for-customer`/`for-car` (payment vertical, code-only)?

## Решение 2026-08-04 (T2 углубление, analyst)

**Code-pointer correction (grounding fix):** the task brief pointed at `engine/src/core/resolve.ts` for
"how orders/domains resolve today" — read it; it is the PEP (`resolveRead`/`resolveWrite`, permission
CLAMP/floor-ceiling combinator), unrelated to order/domain identity. The one-home mechanism this fork
actually needs lives in `engine/src/core/admission.ts::admitHome()` (`HomeRegistry { homes:
Record<FactKind, Domain> }`, lines 85-124) — confirmed by reading both files. `resolve.ts`'s
prefix/exact ceiling asymmetry is F-5's subject, not F-4's; noting here so a future reader doesn't
re-chase the wrong file.

### Сценарии по 4 осям

| Ось | A — unify (один предикат) | B — два постоянных факта |
|---|---|---|
| **Целостность данных** | Высокая — НО только если join верный. Сегодня `sheets:Orders#<numCore>` (regex `\d+-\d+` из колонки `#`) и `rentacar.onecar:Order#<key>` (свободный текст `Order`/`Order Ref`/`Order Number`) не имеют ни общего ключа, ни кода, который их сопоставляет (grep обоих `reduce.ts` подтверждает — разные парсеры, разные исходные строки/листы). Форсированное слияние без проверенного естественного ключа = риск ЛОЖНОГО мэтча (чужой платёж приписан не тому заказу) — это хуже, чем дубль предиката. | Высокая по каждому домену отдельно (sheets — источник правды по аренде/машине/PII; rental-balance — источник правды по деньгам, намеренно без PII). НО: без join-ключа между ними кросс-доменный вопрос "сколько должен ИМЕННО этот sheets-заказ" сегодня НЕ вычислим ни в A, ни в B — это отдельный, более фундаментальный разрыв, который выбор предиката не решает. |
| **Риск потери факта** | Средний-высокий, и НЕ только "два пакета вместо одного файла" (как в исходном Variant A) — **новая находка**: акты уже зажурналены под `rented`/`drives` и `for-customer`/`for-car`; сузить `many→one` задним числом блокирует GAP 3a forward-monotone guard. Единственный легальный путь — re-baseline операция, а её существование/семантика (сохранять ли историю при сужении) — это ОТКРЫТЫЙ F-2, ещё один owner-форк. **Variant A скрыто зависит от решения F-2 первым** — это не было явно в исходном доке. | Низкий — аддитивно, ничего не журналится поверх/вместо старого. |
| **Сложность резолва** | Разовая (два reducer'а), но блокирована F-2 (см. выше) — сложность НЕ только инженерная, а процедурная (нужен ещё один owner-gate). | Постоянный налог на каждого нового читателя (обе линзы), НО формализуем через declared `fact_kind`/`domain` + allow-list — из скрытого налога делаем явный контракт (см. капабилити ниже). |
| **Покрытие ценностей** (Фин.целостность / Целостность актива) | В теории лучшее покрытие ЕСЛИ факт истинный (одна лента "машина+заказ+деньги"). НА ПРАКТИКЕ, без подтверждённого join, форсированный merge производит ЛОЖНУЮ уверенность в целостности — хуже для Фин.целостности, чем явный пробел. | Каждый домен покрывает свою ценность честно (sheets → Целостность актива/аренды; rental-balance → Фин.целостность), но кросс-доменное покрытие ("баланс по конкретной аренде") остаётся дырой в ОБОИХ вариантах, пока join-ключ не появится — это фиксируется как отдельный будущий разрыв, не решаемый этим фork'ом. |

### Вывод

Держим **B** (ратифицировать как два постоянных факта) — рекомендация из 2026-08-03 подтверждается и
УСИЛИВАЕТСЯ: главный риск варианта A — не объём работы, а то, что сегодня нет проверенного естественного
ключа между двумя "мирами заказов", и попытка слить их вслепую создаёт ложные финансовые привязки
(хуже для Фин.целостности, чем дубль предиката). Плюс A скрыто тянет за собой нерешённый F-2. Это НЕ
угадывание owner-факта "один ли это реальный заказ в реальности" — это отдельный вопрос, который остаётся
открытым (см. "жду от владельца" ниже); вывод B верен ПРИ ЛЮБОМ ответе на него, потому что merge без
join-ключа небезопасен независимо от того, правда ли они один и тот же заказ.

### Спек: HomeRegistry multi-domain allow-list (капабилити, которой не хватало)

**Что гарантирует.** Расширение GAP-3c one-home барьера (`admission.ts::admitHome`) с "1 factKind → 1
домен" до "1 factKind → N явно разрешённых доменов", БЕЗ ослабления барьера для третьего, не заявленного
писателя — именно это обещание держит рекомендация B ("mandatory registry declaration, not silent
tolerance").

**Входы/выходы (без изменений сигнатуры).**
- `admitHome(act: Act, homeRegistry?: HomeRegistry): Admission` — сигнатура та же.
- `HomeRegistry.homes: Record<FactKind, Domain | Domain[]>` — значение теперь ЛИБО строка (текущее
  поведение, unchanged), ЛИБО массив доменов (новый allow-list режим).
- `act.provenance.fact_kind` / `act.provenance.domain` — без изменений (уже открытые поля, Act envelope
  не трогаем, G1/G2 держатся).
- Выход — тот же `Admission` (`{ok:true} | {ok:false, reason}`).

**Инварианты.**
1. **INV-1 обратная совместимость.** Реестр только с одиночными (`string`) записями ведёт себя БАЙТ-В-БАЙТ
   как сегодняшний `admitHome` (line 118 сравнение `dom !== home` не меняется для этой ветки).
2. **INV-2 закрытый мир на factKind.** Если factKind зарегистрирован (одиночно ИЛИ allow-list) — писать
   его может ТОЛЬКО домен из `{home}`/`{domains}`; любой другой домен, заявивший этот `fact_kind`,
   отклоняется. Это и есть обещанная защита от третьего случайного писателя.
3. **INV-3 fail-open не меняется.** Отсутствие `fact_kind`/`domain` на акте по-прежнему = `ok()` — эта
   капабилити НЕ решает fail-open/closed за F-3, использует текущий дефолт как есть.
4. **INV-4 stateless.** Решение — чистая функция от `(fact_kind, domain, registry)`, без чтения истории
   графа (ядро остаётся простым, G1).
5. **INV-5 явность, не выведение.** factKind становится multi-domain ТОЛЬКО через явную запись в реестре
   — никогда не выводится автоматически из факта "у него оказалось два писателя". Это буквально то, что
   просила рекомендация B ("registry declaration, not silent tolerance").

**Как приземляется на код.**
- `admission.ts:95-97` (`HomeRegistry` interface) — тип значения `homes` меняется с `Domain` на
  `Domain | Domain[]`. Аддитивно, не ломает существующие вызовы.
- `admission.ts:110-124` (`admitHome`) — строка 118 (`dom !== home`) разветвляется: `Array.isArray(home)
  ? !home.includes(dom) : dom !== home`. Оценка ~10-15 строк diff, ничего не удаляется.
- Конкретная регистрация для F-4/B: `homes: { 'order-customer-edge': ['sheets', 'rental-balance'] }`.
- **Предпосылка, общая с F-3 (не отдельная новая проблема):** ни sheets-reducer, ни rental-balance
  reducer сегодня НЕ проставляют `provenance.fact_kind`/`domain` (F-4 grounding, строка 29-30 выше) — оба
  писателя должны начать это делать, ИНАЧЕ капабилити инертна (как и сам one-home барьер сегодня, по
  F-3 grounding). Также ни один `cli.ts` не инжектирует `HomeRegistry` 4-м аргументом в `Engine` (та же
  F-3 находка) — без этого allow-list не подключён, барьер = no-op. Эта капабилити и F-3 делят ОДНУ и ту
  же wiring-предпосылку; строить их стоит вместе, не отдельными PR.
- **Верификация (план, не реализация):** unit-тест на `admitHome` — (a) allow-list с 2 доменами пропускает
  оба, (b) 3-й домен отклоняется с тем же текстом ошибки что и single-home ветка, (c) regression:
  существующие single-domain кейсы (F-3's `write-plane.test.ts:149-153`) продолжают проходить без правок.

### Жду от владельца

1. **Не блокирует B, но нужен для будущего join:** являются ли `sheets:Orders#<numCore>` и
   `rentacar.onecar:Order#<key>` одним и тем же реальным заказом (будущее слияние) или постоянно разными
   сущностями (разные тенанты/фикстуры)? Ответ определяет, стоит ли когда-либо инвестировать в
   join-ключ/сверку между доменами — НЕ определяет решение B выше (оно верно при любом ответе).
2. Строить multi-domain allow-list СЕЙЧАС (спек выше, малый аддитивный диф, делится wiring-предпосылкой
   с F-3) — или отложить до реального риска третьего писателя? (исходный вопрос 2, теперь с готовым
   планом реализации, дешевле одобрить.)
3. Если когда-нибудь выбран A — какое имя предиката побеждает (`rented`/`drives` vs
   `for-customer`/`for-car`)? Плюс новое: A требует СНАЧАЛА решения F-2 (re-baseline/forward-monotone) —
   владелец должен знать, что A — это два owner-форка, не один.
