---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-30
Scope: project
node_type: spec
title: M2 — пошаговая спека сборки (light read-path, обратимый same-as)
Related:
  - ./04-m2-dedup-and-customer-lens.spec.md              # контракт M2 (R1/R2/R3, AC1–AC8) — этот файл = его build-steps
  - ./03-observation-latest-wins.spec.md                # EQ-1: latest-wins по позиции в журнале (key type:subject:ref)
  - ../analyses/08-designpack-adversarial-critique.analysis.md  # #3 light read-path (predicates.ts:62-67); переоценка цены как «ядро»
  - ../analyses/09-qd1-qd2-data-findings.analysis.md    # Q-D1 канон=transactions (НЕ exp-transactions); Q-D2 паспорта нет → Name+Mobile
  - ../analyses/04-real-data-grounding.analysis.md      # A1: реальные дубли/грязь + строки-фикстуры
  - ../decisions/01-direction-and-mvp.decision.md        # D5: обратимый same-as, БЕЗ автослияния
  # ── evidence anchors (real code, read-only, 2026-07-30) ──
  - ../../../../packages/engine/src/core/predicates.ts   # foldEdges many: replace-in-place by (predicate,target) L62-67 — несущий факт light-path
  - ../../../../packages/engine/src/core/projection.ts   # foldInto: edges МЕРЖАТСЯ (не clobber); superseding domain_event; id=source_ref
  - ../../../../packages/engine/src/core/admission.ts    # scan(edge.meta): PII-keys + PHONE_RE ≥9 цифр → REFUSE; provenance/validFrom НЕ сканируются
  - ../../../../packages/engine/src/engine.ts            # idempotency dedup по source_ref+snapshotHash (L81-88)
  - ../../../../packages/engine/src/core/types.ts        # Edge.meta / Edge.provenance(unscanned); Provenance.snapshotHash
  - ../../../../packages/ingest-rentacar/src/core/keys.ts # customerSourceRef per-occurrence; numCore уже стабилен
---

# M2 — пошаговая спека сборки (build steps)

> **Что это.** `specs/04` = КОНТРАКТ M2 (что должно быть: R1/R2/R3, AC1–AC8). Этот файл = **как это
> собрать по шагам** самым лёгким обратимым путём, подтверждённым чтением кода движка. Фаза = ДИЗАЙН НА
> БУМАГЕ: кода тут нет, каждый шаг = тестируемый минимум с DoD и тест-гейтом. Ничего в `packages/**` не
> меняем — весь M2 ложится **поверх сегодняшнего движка** как app-код (генератор кандидатов + write-helper
> актов + read-модуль линзы).

---

## 0. Путь M2 — LIGHT READ-PATH (подтверждён кодом)

**Вердикт: light read-path состоятелен. M2 первой ценности строится на СЕГОДНЯШНЕМ движке, БЕЗ правки
ядра, БЕЗ re-key редьюсера под `canonicalId`, БЕЗ ратификации ADR-draft-04.** Проверено пофайлово
(read-only, 2026-07-30):

**Несущий факт (обратимость D5 «бесплатна» на read-path):** `predicates.ts::foldEdges`, ветка `many`
(L62-67):
```
const idx = result.findIndex((e) => e.predicate === edge.predicate && e.target === edge.target);
if (idx >= 0) result[idx] = { ...edge };   // REPLACE-IN-PLACE + refresh meta
else result.push({ ...edge });
```
`same-as` в `DEFAULT_PREDICATES` **не зарегистрирован** ⇒ `cardinalityOf` даёт дефолт `many` (L39-42).
Значит:
- **merge** = `domain_event` c ребром `same-as A→B`, `meta.status='confirmed'`.
- **un-merge** = ещё один `domain_event` (source_ref = A) с ТЕМ ЖЕ ребром `same-as A→B`, но
  `meta.tombstone=true` → `foldEdges` находит `(same-as, B)` и **перезаписывает активное ребро
  tombstoned-версией на месте**. Узел цел, второй клиент B цел, факты целы (LOSE-NOTHING).
- **re-merge** = ещё `domain_event`, `meta.tombstone=false` → снова replace-in-place.
- **линза** (read-path) фильтрует `predicate==='same-as' && meta.status==='confirmed' && meta.tombstone!==true`.
- **latest-wins «по построению»**: replace-in-place идёт в порядке журнала → активной остаётся ПОСЛЕДНЯЯ
  версия ребра (EQ-1, `specs/03`: позиция в журнале, не wall-clock). `rebuild-from-journal` даёт то же
  (foldInto = project, `projection.ts` §CQRS-гейт).

**Почему НЕ нужен «новый предикат ребра-tombstone + фолд в ядре» (как утверждал `specs/04` §6/R2.2):**
tombstone здесь — это **поле в `meta`**, читаемое линзой, а НЕ вытеснение на уровне фолда. Сегодняшний
`many`-фолд уже даёт replace-in-place по `(predicate,target)` — этого достаточно. Тяжёлая ядровая
машинерия из `specs/04` §6 была **переоценкой цены** (`analyses/08` #3), а не необходимостью.

**Почему НЕ нужен re-key под `canonicalId` для первой ценности:** AC4 (обратимое слияние ДВУХ РАЗНЫХ
клиентов) чиста на `source_ref` — двум distinct-клиентам `canonicalId` не нужен, а `numCore` уже
стабилизировал `source_ref` против частого дрейфа (`keys.ts:18-22`). `canonicalId`/ADR-04 =
**переклассифицировать в PREREQ M4/денег**, не блокер M2 (`analyses/08` #1, Top-риск 1).

### Что light-path ТРЕБУЕТ (это app-работа write-helper/линзы, НЕ правка `packages/engine`)

Три инженерных детали найдены чтением кода — их надо заложить, иначе light-path «тихо» сломается. Ни одна
не трогает ядро:

1. **R-LIGHT-1 (idempotency).** `engine.write` дедупит `domain_event` по `source_ref + snapshotHash`
   (`engine.ts` L81-88). merge/un-merge/re-merge имеют ОДИН source_ref (=A) → **каждый toggle обязан
   нести РАЗНЫЙ `snapshotHash`**, иначе re-merge после un-merge совпадёт по хэшу с первым merge и будет
   **NO-OP** (проекция останется tombstoned = баг). → write-helper считает
   `snapshotHash = hash({predicate, target, tombstone, status, confidence, seq})`, где `seq` —
   монотонный дискриминатор (ISO-время/uuid акта). `snapshotHash` лежит в `provenance` (НЕ сканируется).
2. **R-LIGHT-2 (admission).** `admission.ts::scan` проверяет **`edge.meta`** на PII-ключи И на
   `PHONE_RE` (≥9 цифр подряд) / `EMAIL_RE` (L99-106). Значит в `meta` ребра `same-as` **нельзя** класть
   сырой телефон/имя/e-mail и нельзя длинные цифро-строки. Кладём ТОЛЬКО метки:
   `status ∈ {confirmed}`, `confidence ∈ {high,medium}`, `provenance ∈ {manual}`, `tombstone:boolean`.
   Время/номер — НЕ в `meta` (иначе REFUSE). Это усиливает EQ-3, а не обходит. `edge.provenance`
   (top-level) и `validFrom/To` — unscanned (`types.ts` D3), но их не задействуем в M2.
3. **R-LIGHT-3 (линза = аддитивный read-модуль).** Фильтр edge-meta во время обхода НЕ входит в
   замороженную грамматику `FilterCond` (`types.ts`: type/field/contains/visible_to). Линза клиента =
   **новый read-путь** (новый view-kind `customer-lens` в `view-compiler`, ЛИБО отдельная read-функция
   обхода) — это *аддитивно* (grow-by-demand, как новый предикат), не мутация существующего фолда/ядра.

**Кандидаты НЕ пишутся в канонический граф (усиление D5).** Кандидаты R1 = **предложения**, не рёбра
графа: эмитятся как non-projectable вывод (отчёт ИЛИ `observation`-акт, минует `foldInto` —
`projection.ts` L42-44). В `domain_event` `same-as`-ребро попадает **только ручной confirm**. Так
автослияние структурно невозможно (кандидатов нет в проецируемом фолде вовсе), а не «отфильтровано».

---

## 1. Build steps (каждый = тестируемый минимум с DoD)

> Порядок = зависимости. S1→S2 (генерация кандидатов), S3→S4 (обратимые акты), S5→S6 (кластер+линза).
> S3/S4 не зависят от S2 (confirm — ручной вход, не из кандидата напрямую): кандидат лишь ранжирует показ.

### S0 — Предусловие (не шаг сборки, гейт входа)
- M1 `ingest-rentacar` дал `customer`-узлы per-occurrence (`keys.ts::customerSourceRef` =
  `sheets:Orders#<numCore>:customer`). Гейт валидности строки-клиента: **numCore И (Name ИЛИ Mobile)**
  (отсекает спилл-мусор UNPAID 8–33 ДО дедупа).
- **PayloadStore + EQ-3-гейт открыт** для чтения name/phone на РЕАЛЬНЫХ данных. На фикстуре — синтетика.
- **DoD:** фикстура (§4) грузится в N валидных customer-узлов; спилл-строки не создали узлов.

### S1 — Нормализаторы (только для скоринга, НИКОГДА не ключ)
- `phone_norm` — E.164 по стране: `380674842880`→`+380674842880`, `79263869765`→`+79263869765`,
  `971501534168`→`+971501534168`; пустой Mobile → сигнала телефона нет.
- `name_norm` — `upper + trim + сортировка токенов`: `Kushnerev Vladislav` ≡ `Vladislav Kushnerev`;
  многотокенные (`Andre Hernung Kemer E Silva`) → множество токенов.
- `plate_norm` (для S6 штрафов, best-effort) — три формата `FF-71397` / `Y-62392#25` / `(CC) 78750`.
- **Инвариант:** нормализованное значение НЕ попадает в `id`/ключ/`source_ref` (A1 §2) — только сравнение.
- **DoD:** таблица истинности на реальных строках §4 (мультиформат сводится; пустой Mobile → null;
  транслит `MOHAMMAD…`≠`Mohamed…` НЕ схлопывается name_norm'ом).

### S2 — Генератор кандидатов `same-as` (R1) — НЕ пишет граф
- Вход: валидные customer-узлы; PII разворачивается из PayloadStore (EQ-3).
- Правило уверенности:
  - **high** — `phone_norm` совпал **И** `name_norm` совпал.
  - **medium** *(дизайн-гипотеза)* — один сильный сигнал (телефон совпал/имена разные, ИЛИ имя совпало/
    телефон пуст-разный). Существование/порог правила — **отложено до первого полного прогона** (§5).
  - **none** — ребро НЕ предлагается (near-match имени без телефона; транслит-ловушка).
  - Национальность — тай-брейк (расхождение страны понижает доверие), не самостоятельный сигнал.
- Выход: ранжированный список **предложений** (non-projectable отчёт/`observation`), поля БЕЗ сырого
  PII (метки `provenance ∈ {phone,name,phone+name}`, `confidence`, пара source_ref). **Ни high, ни
  medium НЕ пишут `domain_event` и НЕ сливают** (D5).
- **DoD:** AC1 (Kriukovskyi×3 → 3 попарных high; Kushnerev×2 → high); AC2 (Mohammad≠Mohamed → none);
  спилл UNPAID 8–33 не дал кандидатов; вывод не содержит PII (проверка R-LIGHT-2 на форме вывода).

### S3 — Ручной confirm = обратимый акт слияния (R2)
- Владелец подтверждает пару → write-helper пишет `domain_event`: source_ref=A, ребро
  `{predicate:'same-as', target:B, meta:{status:'confirmed', provenance:'manual', confidence}}`,
  `snapshotHash` по R-LIGHT-1.
- `foldInto` мержит ребро в узел A (не clobber; body/type A сохраняются — акт без payload-полей).
- **DoD:** после confirm узел A несёт активное `same-as→B`; узлы A,B целы; идемпотентный повтор того же
  confirm (тот же snapshotHash) = dedup no-op (не растит лог дважды).

### S4 — Обратимое раз-слияние / повторное слияние (R2, ядро AC4)
- **un-merge** = `domain_event` source_ref=A, `same-as A→B, meta.tombstone=true`, НОВЫЙ snapshotHash
  → `foldEdges(many)` replace-in-place → активное ребро становится tombstoned.
- **re-merge** = `domain_event`, `meta.tombstone=false`, ещё НОВЫЙ snapshotHash → снова replace-in-place.
- Ничего не удаляется; оба `source_ref` живут раздельно; откат = обратный акт.
- **DoD:** AC4 (merge→un-merge→re-merge все обратимы, узлы целы) + **AC6** (`rebuild-from-journal` даёт
  тот же набор активных (не-tombstoned) `same-as`-рёбер и эквивалентную линзу; байтового равенства не
  требуем) + R-LIGHT-1 (re-merge после un-merge НЕ дедупнулся в no-op).

### S5 — Кластер по подтверждённым рёбрам (R2.3, обход)
- Кластер = BFS/обход по `same-as` **где `meta.status==='confirmed' && meta.tombstone!==true`**, вперёд
  + вычисляемый инверс (edge-index DEC-12), с **явной границей глубины + cycle-guard**.
- `candidate`/`medium` рёбер в графе нет вовсе (S2) → в кластер физически не попадают.
- **DoD:** AC8 (цепочка клиент→сделки→другие клиенты завершается, без взрыва/цикла).

### S6 — Линза клиента «что знаем о X» (R3) = read-модуль (R-LIGHT-3)
- Вход: `source_ref` клиента (или кластер S5). Обход тем же traverse-bound + cycle-guard.
- Отдаёт (доказуемое A1 §4):
  - **Идентичность:** все написания имени, все телефоны, национальность(и) (PII через PayloadStore/EQ-3).
  - **Аренды:** обход инверса `for-customer` (order→customer, cardinality `one`) → все заказы кластера;
    из body заказа: `Plate No`+`Make Model`, времена, статус, ставка/инвойс, дни, продавец.
  - **Штрафы:** через `plate_norm` (best-effort — при неуверенном матче помечать «возможно») ИЛИ
    имя+телефон в FINES/UNPAID.
  - **Заметки:** сырой `Recent Note` (без извлечения).
  - **Платежи:** через `Order Id` → **`transactions`** (Q-D1 канон клиентских платежей) как факт «есть
    транзакции», **НЕ баланс**. **Обязанность НЕ смешать с `exp-transactions`** (операционные расходы,
    другой домен, `analyses/09`).
  - **observation-факты (M3):** если включены — **latest-wins per (type,subject,ref)** (`specs/03`/EQ-1).
- Честно НЕ отвечает: надёжный баланс/долг; документ личности (паспорта нет — Q-D2); кто вёл машину;
  структурные факты из `Recent Note`; контакт может отсутствовать.
- **DoD:** AC5 (ДО confirm линза видит 1 заказ; ПОСЛЕ ручного confirm — клиент + все 3 заказа Kriukovskyi)
  + AC7 (честность: «есть транзакции», не число; отсутствующее поле называет явно) + запрет смешения
  с `exp-transactions`.

---

## 2. Тест-гейты T1–T4 (на РЕАЛЬНЫХ строках) → маппинг на AC (`specs/04`)

> Гейты — что должно быть ЗЕЛЁНЫМ, чтобы шаг засчитан. Строки — реальные (A1 / `specs/04` §5). Код тестов
> НЕ пишем; ниже — спецификация ожиданий.

| Гейт | Шаги | На чём проверяем (реальные строки) | Ожидаемо | Покрывает AC |
|---|---|---|---|---|
| **T1 — кандидаты и грязь** | S1,S2 | Kriukovskyi `380674842880` ×3 (rows 18/19/21); Kushnerev `79263869765` ×2 (rows 13/23); `MOHAMMAD IBRAHIM KHAN…` vs `Mohamed Aziz Rebai`; пустой Mobile Armen Llchlyan (`45854-2867`, row 7); мультиформат `380…/79…/971…/35799118301`; спилл UNPAID rows 8–33 (26 фантомов, row 33 Name=`F-98950`/Mobile=`Olga`) | Kriukovskyi→3 попарных **high**(`phone+name`); Kushnerev→**high**; Mohammad≠Mohamed→**none**; пустой Mobile→нет телефон-сигнала (в high не попадает); мультиформат нормализуется одинаково; спилл-строки НЕ дали ни узлов, ни кандидатов; вывод БЕЗ PII | AC1, AC2, AC3(частично), + гейт валидности |
| **T2 — обратимость + rebuild** | S3,S4 | Kushnerev ×2 (два distinct `source_ref`): merge → un-merge → re-merge; затем снести проекцию → `rebuild-from-journal` | Все три toggle применились (R-LIGHT-1: разные snapshotHash, re-merge не no-op); узлы/факты целы; после rebuild — тот же набор активных `same-as` и эквивалентная линза | **AC4**, AC6 |
| **T3 — линза клиента (до/после)** | S5,S6 | Kriukovskyi ×3: линза ДО confirm → затем ручной confirm 2 рёбер (кластер из 3 узлов) → линза ПОСЛЕ; клиент без чистых денег | ДО: **1** заказ (кандидаты не склеены — доказывает отсутствие автослияния, D5); ПОСЛЕ: клиент + **все 3** заказа (машины/даты/статусы); платежи = «есть транзакции», НЕ баланс; отсутствующее поле названо явно | **AC5**, AC7 |
| **T4 — обход, admission, разделение доменов** | S1,S3,S5,S6 | Кластер с цепочкой клиент→сделки→другие клиенты; попытка записать `same-as`-ребро с сырым телефоном в `meta`; линза клиента, у которого есть строки и в `transactions`, и в `exp-transactions` | Обход завершается (bound+cycle-guard); admission **REFUSE** акта с телефоном в meta (R-LIGHT-2) и **allow** акта с метками-only; линза берёт платежи ТОЛЬКО из `transactions`, `exp-transactions` в линзу клиента не попадают | AC8, R-LIGHT-2, Q-D1 |

**M2 засчитан, если T2 (AC4) + T3 (AC5) зелёные** (ядро роудмап-гейта T3: обратимость + линза
клиент+заказы). T1/T4 — сопутствующие гейты. Правило `medium` (AC3) — не гейт релиза, отложено до
первого полного прогона (§5).

---

## 3. Тест-фикстуры (описание — код НЕ пишем)

Фикстура строится из реальных строк A1 (peek — верх листа); ожидаемый граф описан явно.

**F1 — high-кластер (Kriukovskyi):** 3 customer-узла, Mobile=`380674842880`, Name=`Kriukovskyi Oleksii`,
заказы `45638-2856`(row18)/`45618-2854`(row19)/`45570-2852`(row21, numCore из `45570-2852Collection`).
*Ожидаемо:* S2 → 3 попарных high; ДО confirm линза=1 заказ; ПОСЛЕ confirm=3 заказа.

**F2 — high-пара (Kushnerev):** 2 узла, Mobile=`79263869765`, заказы `45731-2861`(row13)/`45456-2849`(row23).
*Ожидаемо:* S2→high; используется в T2 (merge/un-merge/re-merge/rebuild).

**F3 — негатив (транслит):** `MOHAMMAD IBRAHIM KHAN SHARIF KHAN` (transactions row12) vs `Mohamed Aziz
Rebai` (unpaid row34), телефоны разные. *Ожидаемо:* none, ребро НЕ создано.

**F4 — пустой Mobile:** Armen Llchlyan, `45854-2867` (row7). *Ожидаемо:* валиден по имени (Name есть),
но телефон-сигнала нет → не в high; кандидат в high только при name-совпадении с другим (medium-гипотеза).

**F5 — мультиформат телефона:** строки с `380…`/`79…`/`971501534168`/`35799118301` (без `+`, разной
длины). *Ожидаемо:* `phone_norm` приводит к E.164 по стране; одинаковые номера в разном виде совпадают.

**F6 — спилл-мусор (не должен стать узлом/кандидатом):** UNPAID rows 8–33 (одна заметка о доставке → 26
фантом-строк; row33 Name=`F-98950` (плита), Mobile=`Olga`). *Ожидаемо:* гейт `numCore И (Name ИЛИ
Mobile)` отсекает до дедупа → 0 узлов, 0 кандидатов.

**F7 — кросс-лист (штраф в линзе):** NAGAEV TALGAT `971501534168` — Orders `45832-2865`(row9) ↔ FINES
row8 (`"NAGAEV TALGAT  971501534168"`); FILKEVYCH YANINA `35799118301` — FINES row13 ↔ UNPAID row35.
*Ожидаемо:* S6 линза подтягивает штраф best-effort (по plate_norm/имя+телефон), помечает «возможно» при
неуверенном матче.

**F8 — разделение доменов транзакций:** клиент, у которого есть строка в `transactions` (платёж по Order
Id) и «шумовая» строка в `exp-transactions` (расход по машине+инвестору). *Ожидаемо:* линза клиента
берёт только `transactions` → «есть транзакции»; `exp-transactions` не смешивается (T4).

---

## 4. Что осталось владельцу (открытые точки)

1. **Правило `medium`** — дизайн-гипотеза; в peek реальной пары под него нет. Существование/порог
   **подтвердить или отозвать на первом полном прогоне** дедупа (между M2 и M3). Не гейт релиза M2.
2. **Первый полный прогон (F-D/Q4)** — точное число distinct-клиентов и доля кластеров: только на полном
   экспорте Orders (4102), не на peek. Peek-цифры A1 = оценка.
3. **EQ-3 (PII-гейт)** должен быть открыт для прогона S2/S6 на РЕАЛЬНЫХ данных (name/phone из
   PayloadStore). На фикстуре — синтетика.
4. **`canonicalId`/ADR-draft-04** — **переклассифицировать из PREREQ M2 в PREREQ M4/денег** (light-path
   M2 идёт на `source_ref`). Ратификация — только когда понадобятся версии/деньги (`analyses/08` #1).
5. **Нормализатор плиты (S1 plate_norm)** — best-effort, три формата; порог «возможно» vs «точно» —
   калибровать на реальных FINES/UNPAID.
6. **Полнота `transactions` (8739)** и отсутствие overlap/двойного счёта с exp-таблицами — за живым
   Sheets (Q-D1 §границы).
7. **«Строй».** Этот файл — бумага. На диск/код — только по явному «строй» владельца.

---

## 5. Итог — путь и почему

- **Путь: LIGHT READ-PATH** — подтверждён кодом (`predicates.ts:62-67` many replace-in-place;
  `same-as` unregistered ⇒ many; `admission.ts` scan; `engine.ts` idempotency). Обратимость D5 =
  **meta-tombstone на ребре + фильтр в линзе**, БЕЗ нового ядрового предиката, БЕЗ re-key под
  `canonicalId`, БЕЗ ратификации ADR-04 для первой ценности.
- **Блокера НЕ найдено.** Нашлись 3 app-требования (R-LIGHT-1 разные snapshotHash на toggle;
  R-LIGHT-2 meta без PII/цифр; R-LIGHT-3 линза = аддитивный read-модуль) — все реализуются поверх
  движка, ядро не трогаем.
- Тяжёлый путь `specs/04` §6 («новый предикат-tombstone + фолд в ядре» + re-key) был переоценкой цены
  (`analyses/08` #3), для первой ценности не нужен.
