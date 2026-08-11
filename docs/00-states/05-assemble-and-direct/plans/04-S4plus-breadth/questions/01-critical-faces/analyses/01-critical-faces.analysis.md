---
node_type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
agent: analyst
question: ../critical-faces.question.md
inputs:
  - ../../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/00-width-census.synthesis.md
  - ../../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/raw/02-paired-faces.map.md
  - ../../../../../_shared/task-pool.md
  - ../../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/READINESS-VERDICT.decision.md
  - ../../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md
related:
  - ../../../../../../../../packages/engine/src/core/erasure.ts
  - ../../../../../../../../packages/engine/src/adapters/store-durable-fs.ts
  - ../../../../../../../../packages/ingest-rentacar/src/core/hash.ts
---

# Q-critical-faces — deep analysis: ранжирование 19 граней D1.b width-census

## 0. Метод
Каждая грань census-матрицы (`00-width-census.synthesis.md:52-70`) оценена по 4 осям:
- **(a) критический путь** — без неё нельзя честно заявить "хребет доказан" (G2) или "формы заложены" (G1)?
- **(b) блокирует какой G** — G1 формы / G2 хребет / G3 честность / G4 форки / G5 ширина (сама по себе, тавтологично — исключена как ось, все грани по определению G5; используется для G1-G4 пересечения).
- **(c) зависимость от Закона-1/Закона-2** — можно закрыть НЕЗАВИСИМО от исхода S1-ратификации, или блокирована последовательностью C→A→B (`plans/INDEX.md` цепь)?
- **(d) текущий статус** — сверено с `task-pool.md:49-62` (актуальнее census-файла, датированного 2026-08-06).

## 1. Полная таблица (19 граней, статус СЕЙЧАС, не 2026-08-06)

| # | грань | статус сейчас (task-pool) | критический путь? | блокирует | зависит от Law1/2? | ранг |
|---|---|---|---|---|---|---|
| 1 | §9-1 именованная граница writeAct→hydrateFromDisk | ✅ closed (было закрыто до census) | — | — | — | CLOSED |
| 2 | §9-2 erasure подключён к диску | **done** (Этап1, `task-pool.md:61`) | было да | G1 | нет | CLOSED |
| 3 | §9-3 shred-assert независимый снимок | **done** (Этап2, verified 3 вектора, `task-pool.md:52`) | было да | G2 | нет | CLOSED |
| 4 | §9-3b same-as lock через диск | **done** (Этап2, `task-pool.md:54`) | было да | G2 | нет | CLOSED |
| 5 | §9-4 property-based fault-injection + независимый oracle | **todo**, явно "блокер-кейстоун" (`task-pool.md:60`); assignment уже написан (`build/stage3-property-fault-injection.assignment.md`, не исполнен) | ДА — без этого крэш-падучесть доказана на hand-picked offset, не genuine-fuzzing | G2 (хребет) | **нет** — чистая инженерия, можно начать сейчас | **CRITICAL** |
| 6 | §9-5 численный cap на срез | todo, deferred-with-home (`task-pool.md:62`) | нет | процесс-гигиена | нет | defer |
| 7 | §9-6 owner-legible артефакт | todo, deferred-with-home | нет | коммуникация, не корректность | нет | defer |
| 8 | §9-7 позитивный form-agnostic leak-test | todo, deferred-with-home; **вакуозен пока `DEFAULT_PREDICATES={}`** (census сама это отметила) | нет (пока пусто — тест ничего не проверит) | G1 (частично) | нет | defer (переоценить, когда предикаты появятся) |
| 9 | §9-8 CG-06 referent reject-path (дизайн) | todo, deferred-with-home | нет (design, не код) | G1/G3 | нет | defer |
| 10 | §9-9 V4 второй агент (процесс-сверка) | todo, deferred-with-home | нет | процесс, не код | нет | defer |
| 11 | S10 MemoryStore→DurableFsStore реальный путь | **done** (Этап1, verified 2 вектора, `task-pool.md:49`) | было САМЫЙ критический (census §2 п.1) | G1+G2 (весь прототип лабораторный без этого) | нет | CLOSED |
| 12 | S11 нет-payload-key в journal (precond-2) | todo, deferred-with-home | нет | G1 (мелко) | нет | defer |
| 13 | S12 dist/src parity | todo, deferred-with-home | нет | инфра-долг, не корректность | нет | defer |
| 14 | F2 erased-read contract (dangling ref → маркер) | todo, **схлопнут в `T-D1b-rest`** вместе с deferred-гранями (`task-pool.md:62`) — census сама метила `🟥 БЛОК (новая)`, НЕ "отложена-с-домом" (`00-width-census.synthesis.md:65`) | ДА — без этого read-путь после shred НЕ определён = G1 форма неполна (Закон-1 требует ФОРМУ сейчас, а "что возвращает read() на стёртый payload" это и есть форма) | G1 | частично — точная форма маркера может зависеть от Закона-1 deref-seam, но КОНТРАКТ (что НЕ null-без-объяснения) можно зафиксировать сейчас | **CRITICAL (promote from smuggled-defer)** |
| 15 | F3 durability order META↔payload (2-write crash window) | todo, схлопнут в `T-D1b-rest`; census-СИНТЕЗ называет её "механический **runner-up**" (`00-width-census.synthesis.md:66`), отдельно от F4 — **ИСПРАВЛЕНО критик-проверкой (§3):** первоисточник `raw/02-paired-faces.map.md:52-56` называет **F3+F4 ВМЕСТЕ "the deepest MECHANICAL hole"**, одна write-гонка (journal fsync `store-durable-fs.ts:173` vs независимый blob-write). F3 = ПРИЧИНА (durability-order сломан → "dangling-ref-at-birth", `raw/02-paired-faces.map.md:36`), F4 = СЛЕДСТВИЕ (orphan). Census-синтез при своде трёх карт разрезал пару и формулировкой "runner-up" потерял этот вес | ДА — F3 не второстепенна, она ПРИЧИНА дыры F4; без явного WAL-порядка "durable" claim by-ref-сплита ложна с рождения | G1 (ЯДРО claim "durable" — retrofit-невозможный порядок записи, Закон-1 логика) | нет — чистая инженерия | **CRITICAL (promote — пара с F4, НЕ ниже cut-line)** |
| 16 | F4 orphan payload (unerasable PII без референта) | todo, схлопнут в `T-D1b-rest`; census-СИНТЕЗ метила `🟥 БЛОК (новая)` (`00-width-census.synthesis.md:67`); первоисточник `raw/02-paired-faces.map.md:37,53-56` — inverse F3, часть ТОЙ ЖЕ пары "deepest mechanical hole" | ДА — если orphan-блобы никогда не посещаются erasure, это дыра именно там, где владелец просил "hard guarantee" (реальный PII ga-rentacar, та же срочность что owner-форк R4); ПАРНАЯ грань к F3, не отдельная | G1 + де-факто G4 (тикает как R4) | нет — sweep-механизм независим; ТОЛЬКО список классов для sweep зависит от R4 | **CRITICAL (promote — пара с F3)** |
| 17 | F6 form-agnosticism SUFFICIENCY (2-й структурно иной формат) | **partial** — сериализация ✅, проекция 🟡, `decided-pending-owner` (`task-pool.md:51,57`); census called it "**⭐ САМАЯ важная новая грань**" (`00-width-census.synthesis.md:68`) | ДА — это буквально анти-тавтология-тест Закона-2 (G2), DIRECTION §1 называет F6-восстановление прямой инстанцией Закона-2 | G2 (keystone) | **ДА, напрямую** — F6-завершение = S3 гейт, блокирован последовательностью S1→S2→S3 | **CRITICAL #1** |
| 18 | F5 cascade-erasure дом | ⬜ deferred-with-home, явно привязана к FORK-2 (`task-pool.md:62`, census `:69`) | нет (по замыслу, не блокер D1.b) | — | нет | defer (correctly) |
| 19 | F1 recall через agent-door (read-PEP) | ⬜ deferred-with-home, явно D1.c/Q1, вне scope D1.b (`00-width-census.synthesis.md:70`) | нет для D1.b (но READINESS-VERDICT отдельно флагует как canon-lie vs UNIT-SPEC:87 — ДРУГОЙ трек, не эта грань) | — (не G5 D1.b) | нет | defer (correctly, но не терять — уже есть отдельный якорь в READINESS-VERDICT) |

## 2. Находка: census-цифра "16/19 empty" устарела
`READINESS-VERDICT.decision.md:18-19,29` цитирует "16 из 19 пусто, 🟥 BLOCK" — это снимок ДО Этап1/Этап2.
Текущий task-pool показывает **5 граней уже `done`** (§9-2, §9-3, §9-3b, S10 — плюс §9-1 было закрыто ещё
раньше). Реальный счёт СЕЙЧАС: ✅/done 5 · partial 1 (F6) · deferred-corretly 9 (§9-5..9-9, S11, S12, F5,
F1) · **смугл-риск 3 (F2, F3, F4 — понижены в deferred без явного downgrade-решения, источник ниже)** ·
открытый keystone-blocker 1 (§9-4). Это НЕ меняет вердикт "не готово к S4" (F6 всё ещё partial, §9-4 всё
ещё todo), но владелец должен видеть актуальную, не двух-дневную цифру при ратификации.

## 3. Смуглинг-риск (F2/F3/F4) — источник ИСПРАВЛЕН критик-проверкой
**Атрибуция исправлена (была неверной в первом черновике):** источник понижения F2/F3/F4 из `🟥 БЛОК` в
"отложить-с-домом" — это сама **census-СИНТЕЗ-сессия 2026-08-06**, раздел 2 итоговой рекомендации
(`00-width-census.synthesis.md:90-92`: *«Отложить-с-домом (не блокируют вход в прототип, но не терять):
§9-5 (число cap), §9-6 (owner-card), §9-7 (form-agnostic leak-test), §9-8 (referent reject-path), §9-9 (V4
второй агент), S11, S12, **F2, F3, F4**, F5→FORK-2»*) — ПРОТИВОРЕЧИТ собственной матрице той же сессии
(`00-width-census.synthesis.md:65-68`), где F2/F3/F4 помечены `🟥 БЛОК (новая)`, ОТДЕЛЬНО от истинно-
deferred граней со статусом `⬜ отложена-с-домом`. Task-pool (`task-pool.md:62`, строка `T-D1b-rest`) НЕ
самостоятельно смуглит — он ВЕРНО унаследовал понижение уже сделанное census-синтезом; task-pool не
источник, а канал передачи. Это ровно паттерн, о котором предупреждает сам queue-card
(`QUEUE-questions.plan.md:121-122`) — только источник на один шаг раньше, чем черновик предположил
изначально. Не нашёл anchor с явным ОБОСНОВАНИЕМ, почему census-синтез сам себе противоречит между §1
(матрица: BLOK) и §2 (рекомендация: defer) — это и есть owner-вопрос (см. §7 и `synthesis/`).

## 4. Топ «критические 20%» (рекомендация черновика, ИСПРАВЛЕНО критик-проверкой)
5 граней из 19 (≈26% — чуть шире строгих 20%, но F3+F4 держатся ПАРОЙ по первоисточнику, разносить их
искусственно ради ровного числа было бы само по себе смуглингом):

1. **F6** — form-agnosticism sufficiency (2-й структурно иной формат). Census сама зовёт "самой важной
   новой гранью"; DIRECTION напрямую связывает её с Законом-2/G2. Без неё "хребет доказан" остаётся
   тавтологией одной формы. Зависит от Law2/S3-гейта — не закроется раньше своей очереди в цепи C→A→B, но
   должна быть В СПИСКЕ 20%, потому что она keystone, а не потому что она готова закрыться завтра.
2. **§9-4** — property-based fault-injection с независимым oracle. Единственный оставшийся ОТКРЫТЫЙ пункт
   из исходного "минимального набора для genuine-падучего прототипа" (census §2), который НЕ зависит от
   законов — можно закрывать прямо сейчас, assignment уже готов.
3. **F2** — erased-read contract (dangling ref → определённый маркер). Промотирована из смугл-риска: без
   определённого поведения read() после shred, форма (Закон-1) неполна на самом видимом месте — первом,
   что увидит любой вызывающий после erasure.
4. **F3 + F4 (ПАРА, не разносить)** — durability-order (F3, причина) + orphan payload sweep (F4, следствие).
   Первоисточник `raw/02-paired-faces.map.md:52-56` называет их ОДНОЙ "deepest mechanical hole": journal
   fsync (`store-durable-fs.ts:173`) и blob-write — независимые швы без WAL-порядка; крэш между ними даёт
   ЛИБО dangling-ref-at-birth (F3), ЛИБО orphan unerasable-PII (F4) — это одна write-гонка, наблюдаемая с
   двух концов. Census-синтез (§3 выше) разрезал пару и словом "runner-up" незаслуженно понизил F3 —
   исправлено здесь. Оставлять пару отложенной означает оставлять недоказанным сам "durable"-claim by-ref-
   сплита, а не периферийную деталь.

Итого топ = **F6 · §9-4 · F2 · F3+F4** — 4 пункта повестки, 5 граней матрицы.

## 5. Что явно откладываем (9 граней, без спора)
§9-5 (численный cap) · §9-6 (owner-card) · §9-7 (leak-test, вакуозен пока predicates пусты) · §9-8
(referent design) · §9-9 (V4 процесс-сверка) · S11 (payload-key journal test) · S12 (dist/src parity) ·
F5 (cascade-erasure, явно привязана к FORK-2) · F1 (read-PEP, явно вне D1.b scope, свой трек в D1.c/Q1).
Все имеют дом (`T-D1b-*` в task-pool или FORK-2/D1.c), ничего не потеряно.

## 6. Зависимость выбора от исхода Law1/Law2
Само РАНЖИРОВАНИЕ независимо (можно готовить параллельно S1, как и заявлено в queue-card). Но из топ-5:
только **F6** блокирована последовательностью ратификации (не может закрыться раньше S3-гейта). §9-4, F2,
F3, F4 могут начинаться НЕЗАВИСИМО от исхода законов уже сейчас — это значит "критические 20%" не равно
"то, что первым закроется": F6 останется 🟥 дольше всех остальных в топе просто по порядку цепи C→A→B, и
это ожидаемо, не провал ранжирования.

## 7. Открытый вопрос (redirected — см. `synthesis/critical-faces.synthesis.md` для owner-карточки)
**ИСПРАВЛЕНО:** вопрос адресован НЕ task-pool (он верно унаследовал), а **census-синтез-сессии 2026-08-06**
(`00-width-census.synthesis.md`) — её §1-матрица (строки 65-68) метит F2/F3/F4 `🟥 БЛОК`, а её же §2-
рекомендация (строки 90-92) в том же документе относит их в "отложить-с-домом" без видимой аргументации
этого понижения. Нет anchor, объясняющего разрыв. Owner-вопрос (сформулирован как линза, не вердикт,
карточка ниже в `synthesis/`): **(1)** был ли даунгрейд F2/F3/F4 из 🟥БЛОК в отложено НАМЕРЕННЫМ решением
census-сессии (устным/неявным) или технической неаккуратностью свода трёх карт в одну рекомендацию?
**(2)** входит ли F3 в критические 20% РЯДОМ с F4 (как единая пара по первоисточнику `raw/02-paired-
faces.map.md`), или у владельца есть основание держать её отдельно/ниже?
