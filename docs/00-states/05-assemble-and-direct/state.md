---
id: state-05-assemble-and-direct
node_type: state
theme: Как мы собираем всю базу и доводим до «можно строить» — процесс · советники · планы
status: active
owner: jenya.stasik@gmail.com
opened: 2026-08-04
updated: 2026-08-14
agents: [orchestrator-fable]
handoff: ../../_log/2026-08-14-autonomous-staged-continuation/HANDOFF.md
council_brief: ./council-brief.md
inputs:
  - ../../_inbox/2026-08-04-assemble-and-direct/design/00-fact-base.synthesis.md
  - ../../_inbox/2026-08-04-assemble-and-direct/census/
  - ../../_inbox/2026-08-04-picture-coverage/DIRECTION.md
Related:
  - ../STATE.md
  - ../03-brain-productization/state.md
  - ../04-improvement-plans/state.md
---

# 📍 STATE-05 — Собрать и направить

> **⚙️ СТОЯЧИЙ МЕТОД СЕССИИ (всегда, каждый прогон):** «рекурсивная оркестрация с помощником» —
> якорь-правило `../../../.claude/rules/recursive-orchestration-method.md` (6 законов, всегда в контексте),
> механика `../../01-organization/rules-and-skills/recursive-orchestration/METHOD.md`. Каждую сессию:
> высота первым ходом → лид+ПОМОЩНИК(co-orchestrator + мандат-шаблон)+волны 3-6 синхронно → адверсариал ДО
> «готово» → сжатый хендофф. Помощник задаёт вопросы к продукту по 7 ценностям. Заведён 2026-08-15 (agent-builder).
> TODO (не в этой сессии): пульт требует отдельного slimming-прохода — 12 superseded-кнопок подряд, 415 строк.

> **🟢 ТЕКУЩИЙ БАТТОН (2026-08-14 · АВТОНОМНАЯ НОЧЬ ИСПОЛНЕНА — S1-S4, синхронные волны ~11 агентов, 2 вектора проверки, file-first, 0 коммитов):**
> Прогон по мандату `../../_log/2026-08-14-autonomous-staged-continuation/HANDOFF.md` (лид гнал цикл сам,
> самоодобрял обратимое, стопорил на необратимом). **Утренний пакет решений: `../../_log/2026-08-14-autonomous-staged-continuation/S4-land-packet/OWNER-MORNING-PACKET.md` (читать первым).**
> — **S1 ✅ ДВА ADR `proposed` (dual-verified):** `../../architecture/ADR/ADR-0012-egress-port-registry.md`
>   (закрытый список egress-портов, fail-closed, intent-акт ДО — рамка как decision record) +
>   `../../architecture/ADR/ADR-0013-bash-egress-accepted-risk.md` (Bash/curl = реальный порт к 3-му лицу,
>   app-regex принципиально не закрывает → OS-уровень/accepted-risk с подписью владельца). Reviewer PASS,
>   critic «not circling» (двигает ворото). Оба ждут ратификации владельца (гейты C-1…C-5 в ADR-0012).
> — **S2 ✅ МЕТРИКА DEC-A: спека + КОД (ворото сдвинуто):** `faithfulness-at-forks` = 3 связанных числа
>   (SC тихие-пересечения / F верность-по-порту / E экспозиция-анти-трап). Спека:
>   `../../_log/2026-08-14-autonomous-staged-continuation/S2-metric/METRIC-DEC-A.spec.md`. Код заскаффолжен
>   аддитивно: `packages/engine/src/metrics/faithfulness-at-forks.ts` + `test/faithfulness-at-forks.test.ts` —
>   **engine 133 → 142 passed, tsc чист, reviewer PASS, НЕ коммичено.** Honest scaffold (живого источника нет; W-1 `silentlyIgnored` аддитивно).
> — **🔑 НЕСУЩАЯ НАХОДКА (4 агента независимо):** премиса «живого egress к 3-му лицу нет» ОПРОВЕРГНУТА —
>   у FF-сессии живые MCP-коннекторы **Gmail/Calendar/Drive** достают реальных третьих лиц (Calendar
>   `create_event`→внешние участники и т.п.), вне любого реестра/гейта. Закрытый список портов — НЕ гипотеза.
>   Занесено: ADR-0012 §OQ-6 (реестр обязан перечислить коннектор-поверхность) + метрика OF-4 (day-one RED).
> — **S3 ✅ План переезда F2** (describe-only, doc-tree: без «строй» не двигаем):
>   `../../_log/2026-08-14-autonomous-staged-continuation/S3-rehome/MIGRATION-PLAN.md` — 4 файла в
>   `_shared/topics/03-actor-model/`, 7 входящих ссылок замаплено, откат 5 мин. Исполнение = кивок «строй».
> **⏭ OWNER-PENDING (OF-0…OF-10 в утреннем пакете):** OF-0 подтвердить ASSUMED-PORTS-v1 (+порт коннекторов?) ·
> OF-1/2 ратифицировать ADR-0012/0013 · OF-3…6 решения по метрике (стоп=успех? неклассиф=fail? W-1 silentlyIgnored) ·
> OF-7 «строй» на переезд S3 · OF-8 коммит doc-sync · OF-9 land-пакет P-2+egress-Часть-A (рука владельца, чужой репо) ·
> OF-10 ратифицировать I-16. Ночь НЕ коммичена, НЕ трогала `agents-manager`. Пред. баттон ↓ (superseded).
>
> **◻️ (superseded 2026-08-14) БАТТОН (2026-08-13-b · F2 ЗАКОММИЧЕНО + M0 ПЕРЕОСМЫСЛЕН, doc-sync ход, file-first):**
> Продолжение баттона 2026-08-13 (↓, superseded) — код реально построен и слит, премиса M0 честно
> опровергнута стройкой; этот ход синхронизирует доки/пульт с этим фактом (не строит новый код).
> Хендофф-указатель: `../../_log/2026-08-13-metric-and-minimal-slice/HANDOFF-BUILD-F2-done-M0-reframed.md`
> · осевая карта: `../../_log/2026-08-13-metric-and-minimal-slice/wave3-route/NEXT-movement-map.analysis.md`.
> — **✅ F2 ЗАКОММИЧЕНО** (`0590843` "feat: F2 and M0", `refactor-tree`) — форма C1 (согласие by-ref,
>   `ConsentAssurance` без `unknown`-слота, `admit()` сканирует `subjectRole` — R-G3.5) + C3 (`owner`/`referent`
>   kernel-lock, `LOCKED_PREDICATES` в `predicates.ts`) — рабочий код, НЕ просто ratify-ready форма (коррекция
>   к прошлому баттону, который писал «ждёт строй»). `packages/engine` suite: **133 passed | 2 todo** (свежий
>   прогон этого хода; включает новый tripwire `consent-not-enforced.test.ts` — документирует, что enforcement
>   согласия по-прежнему НЕ подключено, только форма). Спека: `../../_log/2026-08-13-metric-and-minimal-slice/wave3-route/ARCH-F2-closure.design.md`.
> — **⏳ KERNEL-LOCK owner/referent — PROPOSED, НЕ ратифицирован** — `../../02-project/core/00-kernel/invariants.md` §I-16
>   (новая Группа 8). Прежняя пометка «owner дал кивок» ОТОЗВАНА (2026-08-14): реального трейса одобрения нет
>   (циклическая само-ратификация «код есть → одобрено»). Текст = почти copy-paste `ARCH-F2-closure.design.md` §3
>   (INV-C3.1-3), proven-by `f2-closure.test.ts` C3. **owner-pending хвост ОСТАЁТСЯ открыт** — нужен явный «да».
> — **🛑 M0 ОСТАНОВЛЕН, ПРЕМИСА ОПРОВЕРГНУТА** (не отменена — уточнена стройкой, см.
>   `wave3-route/M0-reframe-decision.analysis.md` + форма `wave3-route/M0-guard-form.design.md`): worktree
>   `agents-manager-egress-m0` / ветка `feat/egress-port-policy` нашла 3 факта по коду — (1) `intent`-поле
>   недостижимо (нет в zod-схемах `send_message`/`send_to_topic` → вечный DENY, живой egress ломается);
>   (2) `EgressPortPolicy` в `guard` бьёт ДО `SdkToolGate`, тихо гасит намеренную логику (F-E auto-allow,
>   `send_to_topic`); (3) **`send_message` структурно НЕ достигает третьего лица** (шлёт только в текущий
>   разговор) — сегодня живого MCP-порта к третьему лицу/деньгам/shred НЕТ; Bash-сеть (`classifyBash`,
>   `adfaec6`) уже под отдельным гейтом, MCP-имена его не проходят. Рекомендация: **D** — ADR/спека
>   «egress-guard как требование» СЕЙЧАС, код клапана — когда появится реальный тул к третьему лицу. Ветка
>   `feat/egress-port-policy` остаётся reference, НЕ смёрджена в `agents-manager`.
> — **P-2 (gateway-dup) = OPEN, фикс В ПРОЦЕССЕ (не смёрджен).** Ветка `fix/p2-voice-dedup-ingress` в
>   `agents-manager`, worktree `/tmp/agents-manager-p2-fix` (база `4c9fab8`) — ingress-dedup ДО транскрипции,
>   изменения **uncommitted** (5 правлено + 4 новых файла). Канон-расхождение с `gateway-dup/INDEX.md`
>   («в основном закрыт») сведено — см. его `## Update 2026-08-13`. **Land = действие владельца** (merge +
>   `pm2 restart`), FF read-only на `agents-manager`.
> **⏭ OWNER-PENDING (осталось после этого хода):** (1) путь M0 — принять рек. **D** (ADR-спека сейчас) или
> альтернативу B/B+C/отбросить (`M0-reframe-decision.analysis.md`); (2) land P-2 (владелец, вне агентов);
> (3) судьба Стадии-1 (держу, историческое); (4) закрытие сессии/переезд `_log/` артефактов в дом дерева.
> Пред. баттон ↓ (superseded).
>
> **◻️ (superseded 2026-08-13-b) БАТТОН (2026-08-13 · МЕТРИКА + МИНИМАЛЬНЫЙ СРЕЗ → РАМКА ЗАКОММИЧЕНА, F2 ratify-ready, следующий ход = BUILD; 3 синхр. волны ~12 агентов, adversarial, file-first):**
> Оркестрация по 2 вопросам владельца (метрика прогресса · минимальный срез памяти под агента, путь B). Дом: `../../_log/2026-08-13-metric-and-minimal-slice/` (`NAVIGATOR.md` = карта). **Cold-start под стройку: `../../_log/2026-08-13-metric-and-minimal-slice/HANDOFF.md`.**
> — **🧭 РАМКА ЗАКОММИЧЕНА (Fable, рефрейм-без-рефрейма):** необратимость входит только через ПЕРЕЧИСЛИМЫЕ порты; черта = ЗАКРЫТЫЙ СПИСОК портов, каждый fail-closed, intent-акт ДО срабатывания. **Черта живёт на egress (граница агент→мир), НЕ в памяти** (граф обратим by-construction, ADR-0008). Фальсификатор: необратимый эффект вне egress+shred → рамка ложна.
> — **СЕКВЕНС СДВИНУТ:** M5/uid-split уходят с критпути ПОКА принципал один (триггер возврата = «второй принципал → M5 обратно»); enforcement ③ переезжает с движка на egress-guard.
> — **ФОРМА F2 ЗАКРЫТА (ratify-ready, 0 миграций):** `author`→акт (есть) · `owner`+`referent`→паспорт-ребро; согласие by-ref (`ConsentAssurance`, нет `unknown`-поля → PII некуда вложить) + `admit()` сканирует `subjectRole` (R-G3.5); `owner`/`referent` kernel-lock (`LOCKED_PREDICATES`, как `same-as`). Спека: `../../_log/2026-08-13-metric-and-minimal-slice/wave3-route/ARCH-F2-closure.design.md`.
> — **МАРШРУТ M0-M4:** M0 egress fail-open починен (choke-point УЖЕ есть — `sdk-runner.ts:184`, но MCP-тулы fail-open) → M1 P-2 закрыт доказательством → M2 форж `actor` не даёт egress → M3 владелец ВИДИТ нарушение без грепа → M4 машина едет N часов, 0 тихих пересечений = цель.
> — **🚨 ВЕРДИКТ СХОДИМОСТИ (Fable + analyst независимо):** сходимся по картине (список замкнут, форма готова), НО нить шва доверия КРУЖИТСЯ 3-4 сессии (локус черты переехал 4× за ~72ч). **Триггер тревоги:** ещё 2 сессии без смёрженного кода + переезд локуса → WIP-правило → принудительный build M0. ⇒ следующая сессия = СТРОЙКА, не разбор.
> **⏭ OWNER-PENDING (разблокирует максимум):** (1) 🔑 **закрытый список портов черты** — что агент НИКОГДА не делает сам (внешнее сообщение? деньги? стирание? действия от твоего имени?); (2) «строй» на код (F2 + M0); (3) кивок kernel-lock owner/referent; (4) M0 в чужом репо `agents-manager` — санкция на worktree-правку ИЛИ «ADR описывает, билд отдельно»; (5) DEC-A метрика (стоп=успех?). **P-2 land = рука владельца.** Пред. баттон ↓ (superseded).
>
> **◻️ (superseded 2026-08-13) БАТТОН (2026-08-12-d · OWNER-EYE ФОРКИ ЗАКРЫТЫ, adversarial round + owner-proxy синтез, file-first):**
> Финальный owner-eye синтез над раундом адверсариал-ревью (2 стилмена + критик + owner-proxy) по открытым M5-форкам.
> **Каноничный вердикт:** `_shared/topics/03-actor-model/decisions/2026-08-12-owner-eye-forks/SYNTHESIS-owner-eye-verdicts.md`.
> — **D2 · РАТИФИЦИРОВАН** (owner-delegation): ADR-0010 §③-bis + ADR-0011 → genuinely `approved` + provenance-строка.
>   Заодно схлопнута **трёхсторонняя рассинхронизация статуса** (top=approved аспирационно / inline=proposed / direction-review рек.=review) в один честный `approved` — это был тот же класс prose-rot, что FORK-1.
> — **D4 · ЛОЖНАЯ РАЗВИЛКА РАСТВОРЕНА → ЗАКРЫТ ОДИН РАЗ.** «(a) vs (c)» = не выбор: **(a) = ОБЪЕКТ** (engine `trust/`-дом + схема), **(c) = ГЕЙТ** (Constitution-clamp `policy:seam-authority` + честный `unverified`-пол + P-5). Оба стилмена независимо сошлись на ОДНОМ артефакте: engine `trust/` + схема + инертный canary + **машинно-проверяемый P-5-tripwire** + `unverified`-пол = *(a)-объект в (c)-гейте*. Форк decided (`FORK-decision4` status→`decided`), чтобы остановить ре-литигацию (решался ~3× при статусе `draft`). План исполнения = `tracks/` (01-root-of-trust).
> — **D5-main · РЕШЁН = «брокер-семя»**, decided-BUNDLED-with-D4 (`FORK-decision5` status→`decided`). Sub-fork «модуль-в-шлюзе vs standalone» ОТКРЫТ (сцеплен с экстракцией шлюза `coupling=0`).
> — **D8 · Sheets/F-D:** DEFER-не-блокирует-M5, НО «просто адаптер» недооценивает — санкция F-D открывает **D-1 (classifier-gap, ~100% строк стопорятся при наивном fail-closed)** + 4 суб-форка. Приходить как «4-частный бандл», не одна строка.
> — **D9 · F2-seed фикстуры:** делать заодно со следующей engine-волной (test-only, аддитивно, есть mutation-probe).
> **🔑 ЧЕСТНЫЙ ЗАГОЛОВОК (не обольщаться): реального ВОРОТА не сдвинуто.** Закрытие D4 = *convergence-closure* (ценность: не переоткрывать), НЕ «M5 стал buildable» — оно ЧЕКАНИТ P-5, а не гасит существующее ворото. **Настоящее движение вперёд = (i) LAND P-2** (ветка `fix/p2-voice-dedup-ingress` готова — владелец: merge + pm2 restart) **+ (ii) SCOPE ISO-2 uid-split** (единственный трек с дизайном=0, длинный полюс, `tracks/03-isolation-uid-split`). D4/D5 = названный текст поверх этого секвенса, не блокер.
> **⚠️ Остаточная неуверенность (флаг, не решено мной):** формулировка P-5 в ADR-0011 блокирует флип ③ ЦЕЛИКОМ, но G1 (refuse forged `actor`) не зависит от vouched-корня G4 — возможно ③ надо расщепить на независимо-флипаемые под-гейты (technical-content, следующая дизайн-волна). Пред. баттон ↓ (superseded).
>
> **◻️ (superseded 2026-08-12-d) БАТТОН (2026-08-12-c · M5 SAFE PAPER-MOVES, 3 синхр. агента, file-first):**
> Волна безопасных обратимых ходов из синтеза §6 (DESIGN, никакого enforcement/флипа):
> — **P-3 `seamAuthority` зарезервирован (код)** — аддитивный тип-патч (другой агент: `types.ts`/`ports/*`); `write()` цел, 0 миграций, retrofit-невозможен позже → потому сейчас.
> — **P-2 voice-dup** — фикс на ветке `fix/p2-voice-dedup-ingress` в ЧУЖОМ репо `agents-manager` (ingress-dedup ДО транскрипции); **ждёт land+restart владельцем.**
> — **Doc-sync (Decision-1):** trust-линия УЖЕ в git (`3474cd1`); стале «не коммичено / держу Стадию-1» поправлены аддитивно (LOSE-NOTHING) в HANDOFF + этом пульте.
> — **T5-тексты (Decision-7) материализованы:** non-goal («источник резолвера ≠ пути, куда пишет юнит») + гейт `forge-boundary-identity` →
>   `_shared/topics/03-actor-model/decisions/T5-nongoal-and-forge-gate.decision.md`; **тест-заглушка `it.todo('forge-boundary-identity')`** добавлена в `packages/engine/test/trust-plane.test.ts` (инертна, сьют зелёный, seam-freeze не тронут).
> — **Root-of-trust (Decision-4) оформлен PROPOSED-развилкой** `_shared/topics/03-actor-model/decisions/FORK-decision4-root-of-trust.decision.md` (НЕ ратифицирован).
> **⚑ Канонический список решений = синтез §6:** `_shared/topics/03-actor-model/m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md`.
>
> **⏭ OWNER-PENDING (decide-ready — только владелец):**
> — **D2 · ратифицировать ADR-0010 §③-bis + ADR-0011** (сейчас `proposed`; текстовый кивок, 0 кода; P-2 НЕ обходит — enforcement блокирован независимо). **Рек: ратифицировать.** Пакет: `.../decisions/RATIFY-2026-08-12-adr-0010-0011.decision.md`.
> — **D5 · топология шва = «брокер-семя»** (модуль на ярусе хоста, экстрагируемый). **Рек: брокер-семя;** sub-fork «модуль-в-шлюзе vs standalone» ОТКРЫТ (сцеплен с экстракцией шлюза `coupling=0`, вне M5). Разбор: `.../decisions/FORK-decision5-topology.decision.md`.
> — **D4 · вне-полосный корень доверия `seamAuthority`.** ⚠️ **Расхождение на решение владельца:** синтез §6 предлагал **(a)** engine-реестр; более глубокая волна (`FORK-decision4-root-of-trust.decision.md` — 3 дизайна + threat-model) **refuted (a) как false-closure при same-uid ISO-2** и рекомендует **(c) назвать механизм (Constitution-clamp `policy:seam-authority`) + defer + гейт P-5** (+ опц. paper-freeze гибрид). **Рек волны: (c); нужен кивок владельца (a vs c).**
> — **D8 · Sheets/F-D** (реальный ingest) — независим от trust-линии, объём = только адаптер; в своём темпе (рек: частичный CSV дешевле live). `.../decisions/OWNER-FORKS-2026-08-12.decision.md` FORK-3.
> — **D9 · канонический seed `protected_namespaces` в тест-фикстурах** — мелко, продакшн не затронут; заодно со следующей engine-волной. `.../decisions/F2-seed-fixtures.spec.md`.
> **Порядок (§6): 1-2 синхр. бумагу с реальностью → 3(P-3)+4(корень) → 5(форма, после 4) → 6(P-2 параллельно) → 7(бесплатно) → 8-9 хвосты.** Пред. баттон ↓ (superseded).
>
> **◻️ (superseded 2026-08-12-c) БАТТОН (2026-08-12-b · M5-CENSUS+TOPOLOGY, оркестрация 3 синхр. волны ~9 агентов, file-first):**
> ⚠️ **Trust-линия УЖЕ закоммичена** (`3474cd1 "Brain going forward"`, 04:36) — прежнее «НЕ коммичено» по всему пульту
> УСТАРЕЛО; **FORK-1 (судьба Стадии-1) схлопнут** (она в git, тесты зелёные). Рабочее дерево чистое.
> **Перепись ширины M5** (21 грань, 9🟥; ноль работающего источника личности — зелёное = лишь замороженная ФОРМА) +
> **топология** (3 яруса доверия T-ingress→T-agent→T-engine; разрыв на хопе T-agent, шлюз с движком FF не связан) +
> **Fable-синтез** свели в **decision-ready пакет:**
> `_shared/topics/03-actor-model/m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md` (§6 = 9 решений владельца).
> Сырьё: `.../census/01-03` · `.../design/01-03` · форки `.../decisions/OWNER-FORKS-2026-08-12.decision.md`.
> **🔑 Несущее:** критический путь M5 = НЕ выбор топологии, а (a) фикс **P-2 gateway-dup** [чужой репо `agents-manager`] +
> (b) назвать **вне-полосный корень доверия `seamAuthority`** (кто его удостоверяет). Оба тополого-инвариантны.
> Рекоменд. форма шва = **«брокер-семя»** (модуль на ярусе хоста, недостижим агенту, host-stamped IPC-envelope; свернуть→A / вырастить→B).
> Дешёвый ход ДО топологии: зарезервировать `seamAuthority` аддитивно (P-3, нужен «строй»; retrofit-невозможен после 1-го акта).
> **Вердикт: DEFER-build ПОДТВЕРЖДЁН** — resolver-код сейчас = театр (P-2 red + корень доверия не назван). Легальны бумажные ходы 1-5,7.
> **⏭ Чекпойнт на владельце:** дальнейшие агент-волны = театр; нужны 9 решений (§6 синтеза). Пред. баттон ↓ (superseded).
>
> ➕ **Коррекция 2026-08-12 (аддитивно):** «(a) фикс P-2 gateway-dup = критический путь» ВЫШЕ — **устарело.** Дедуп
> УЖЕ починен в шлюзе (`agents-manager` `orchestrator.ts:79-88`, commit `3e3327d`); P-2 **почти закрыт**, остался узкий
> crash-window (fire-and-forget persist, `dedup-store.ts:41-56`). **Длинный полюс теперь = isolation uid-split, НЕ P-2.**
> Бриф: `_shared/topics/03-actor-model/decisions/WORKORDER-gateway-dup-P2.decision.md`. Строки 32/36/108-109 ждут финальной правки пульта.
>
> ➕ **Верифиц. коррекция 2026-08-12 (аддитивно):** «P-2 почти закрыт / не длинный полюс» ВЫШЕ — **корректируется.** Адверсариал по ГОЛОСОВОМУ пути: дедуп срабатывает лишь ПОСЛЕ ≤5-мин транскрипции (`telegram-channel.ts:449-470`), polling-offset grammY в памяти (`bot.js:81,192,421`) → крэш в окне = недедуплен. дубль-ход = **живой voice-dup симптом владельца, корень найден → P-2 ПЕРЕ-ПОВЫШЕН.** Фикс ведёт с ingress-dedup-до-транскрипции. Детали: `WORKORDER-gateway-dup-P2.decision.md` §"Verified correction 2026-08-12".

> **◻️ (superseded 2026-08-12-b) БАТТОН (2026-08-11, R2 — ВЫБОР ПО ЦЕННОСТИ): ФИКС TRUST-ПЛОСКОСТИ (S-C пререквизит).**
> Личная команда лида (Fable-стратег + критик, потом builder-premise + architect-map, file-first) свела:
> параллельная фаза T1-T4 была выбрана по ДОСТУПНОСТИ, не по ценности (критик). Ближе всего к цели
> «доверяемая композиция» = агентный слой S-C, а его пререквизит = 3 бага, где **код СЕЙЧАС противоречит
> инварианту «агент не может сломать доверие»** (подтверждено ПО КОДУ, не по словам):
> **корень F3 `T-write-pep-unwired`** — `engine.ts:73-111` `write()` зовёт только PII/one-home/дедуп, а
> `resolve('write')` НЕ вклинён в путь записи (control-plane объявлен, но не подключён) ·
> **F1 `T-grant-forgery`** `resolve.ts:136-141` (слепо верит `minted_by:'system'`) · **F2 `T-policy-node-provenance`**
> (перезапись узла-политики; поглощён F3). Зависимости: F1+F2 → `resolve.ts` (один write-lock), F3 → `engine.ts`.
> Порядок: F3 → (F1+F2 одним проходом) + досыпать авторизующие гранты в фикстуры. Timebox ~3-5 ч. Контракт/`ports/` НЕ меняется; поведение меняется (фикстуры без грантов упадут — чинить вместе).
> **✅ FORK-U3 РАТИФИЦИРОВАН владельцем (2026-08-11) = `force-bind` на Стадию-1** (движок штампует writer-principal
> на границе записи; самозаявленный `Act.actor` не доверяется). `attest` (подпись/провенанс) — позже, когда
> появятся плагинные агенты. Revisable (гибкость на концептах). Без этого фикс F3 был бы театром (architect).
> **▶ Исполнение:** trust-плоскость (F3+F1+F2+фикстуры) собирается в ИЗОЛИРОВАННОМ worktree (дерево владельца не
> трогаем), независимый вектор-проверки ДО «готово» → мердж по кивку владельца. Поэтапно, стоп если критично.
> **Обзоры (не терять):** `../../../council/raw/2026-08-11-next-step-strategy/` — `SYNTHESIS-next-step.md` (Р1+Р2) ·
> `FABLE-strategist.advisory.md` · `CRITIC-redteam.analysis.md` · `PREMISE-CHECK-trust-bugs.analysis.md` ·
> `AGENT-LAYER-map.analysis.md`. ⏳ doc-discipline: эти file-first анализы позже переселить в дом дерева (сейчас в raw-стейджинге).
>
> **🟥 РЕЗУЛЬТАТ Стадии-1 (2026-08-11, СОБРАНА+ВЕРИФИЦИРОВАНА, НЕ коммичено `⤳[устар. 2026-08-12: закоммичено 3474cd1]`, СТОП на владельца):** builder закрыл F3/F1/F2
> (write-PEP в горячем пути `engine.ts:73-130`; `minted_by` force-bound + `canMintGrant`; namespace-ceiling + непустой seed);
> тесты **180/180**, tsc чист, контракт/`ports/` НЕ тронут, balance-observer цел. Отчёт: `BUILD-trust-plane-stage1.impl.md`.
> **НО независимый reviewer (opus) ЖИВЫМ ЭКСПЛОЙТОМ показал (PASS-WITH-CAVEATS, `REVIEW-trust-plane-stage1.review.md`):**
> цель «агент не может сломать доверие» **НЕ достигнута** — PEP гейтит по **самозаявленному `actor`** (`engine.ts:100,113,122`);
> mallory ставит `actor:'user:admin'` → минтит себе `core:*` + перезаписывает `policy:constitution` = `ok:true`. Фикс лишь
> **перенёс подделку с `minted_by` на `actor`** (та же цена атаки). Это ровно предсказание architect и STOP-flag #1 билдера.
> **⇒ Настоящий гейт (обострён, НЕ театр): аутентифицированный источник principal** = force-bind самого `actor`, а это
> **смена порта** (`T-actor-delegation`, был отдельным под-вопросом FORK-U3). Force-bind на `minted_by` — необходим, но НЕ достаточен.
> Стадия-1 merge-безопасна как ЧАСТИЧНОЕ ужесточение (0 регрессий), но НЕ фиксировать как «доверие защищено».
> **▶ РАЗВИЛКА ВЛАДЕЛЬЦУ (следующий ход):** мерджить Стадию-1 как честное частичное ужесточение + открыть гейт
> actor-authentication (порт), ИЛИ не мерджить и сперва спроектировать шов аутентификации principal. Остаток F2: engine-фикстуры ещё `protected_namespaces:[]` (нет единого канонического seed) — мелкий хвост.
>
> **🎯 РАУНД-3 ДИЗАЙН ШВА (2026-08-11, 3 линзы architect+abstract-thinker+critic, владелец выбрал «сперва проектируй»):**
> `SYNTHESIS-next-step.md` §Раунд-3 (+ `DESIGN-principal-auth-seam.design.md` · `ABSTRACTION-recheck-trust-boundary.analysis.md` · `CRITIC-invariant-and-form.critic.md`).
> Abstract-thinker: это ОДИН баг в 3 масках (`minted_by`/`source_ref`/`actor`); несущая абстракция = **«владелец шва
> штампует принципала; тело — не авторитет»**; **FORK-U3 растворён** (force-bind vs attest = одна форма). Критик поправил
> ДО ратификации: развести **АВТОРИТЕТ≠АТРИБУЦИЯ** (монумent/импорт истории носят атрибуцию в теле как ДАННЫЕ, Закон ②);
> резерв доверия ПЕР-ОСЬ + issuer-id (не плоский enum); **не размораживать подпись `write()`** (резерв аддитивными полями
> конверта, A/B-нейтрально); channel-trust-сейчас = ~ноль (нет аутентифиц. источника до M5). **ADR-класс.**
> **✅ РАТИФИЦИРОВАНО ВЛАДЕЛЬЦЕМ (2026-08-11, «принимаю лучшее решение на текущий момент»):** ИНВАРИАНТ —
> движок НИКОГДА не берёт ОСНОВАНИЕ ПРАВ из самозаявленного поля тела; записанная АТРИБУЦИЯ в теле = данные, не авторитет.
> FORK-U3 растворён. Формализация в ADR + резерв формы (аддитивно) + enforcement-позже — задачи свежей сессии.
> **📄 ADR НАПИСАН + ФОРМА ЗАРЕЗЕРВИРОВАНА В КОДЕ (2026-08-11, владелец дал «строй», оркестрация 3 агента синхр.):**
> `../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md` (SPLIT) —
> ① Инвариант = **approved** (ратифицирован); ② резерв формы = **approved/в-коде** — `packages/engine/src/core/types.ts`
> `Act.principal?: PrincipalAssurance` (пер-ось `whoActed`/`underWhoseAuthority` + `issuer` + слот `delegation`),
> аддитивно, 0 миграций, подпись `write()` цела, **184/184 тестов**, tsc чист, `ports/` целы, Стадия-1 не тронута;
> независимый reviewer **PASS-WITH-CAVEATS** (0 дефектов; тест compile-only by design — не читать как behavioral coverage);
> ③ выбор A/B/C + enforcement = **open** (форк владельца, до M5/`ViewerResolver`). НЕ коммичено `⤳[устар. 2026-08-12: форма ② закоммичена 3474cd1; ③/enforcement всё ещё open]`.
> **✅ ХВОСТ ingest-`actor` РАЗРЕШЁН (analyst):** BOTH — атрибуция в эффекте, латентный авторитет по механизму
> (`engine.ts:113/122` берут `finalized.actor` как viewer/minter); инертно лишь т.к. таргеты не привилегированы.
> НЕ новое нарушение — тот же класс, что ③/`forge-actor`. + doc-smell: `ingest-rentacar`↔`rental-balance` дублируют ingest-пары (отдельная задача).
> **⏭ Стадия-1 — держу uncommitted** `⤳[устар. 2026-08-12: УЖЕ в git 3474cd1, FORK-1 схлопнут; рек — признать как частичное ужесточение]` (частичное ужесточение, форж переехал `minted_by`→`actor`); мердж/доработка = отдельный кивок.
>
> **🧭 DESIGN-ВОЛНА ПО DECISION ③ (2026-08-12, 4 агента: architect+analyst+critic+Fable-синтез, синхронно, file-first):**
> `_shared/topics/03-actor-model/design/` — `01-seam-and-lifecycle.design.md` · `02-caller-reality.analysis.md` ·
> `03-values-and-threat.critic.md` · `04-SYNTHESIS-decision-ready.md` (Fable — читать первым). **ВЕРДИКТ: DEFER build,
> RATIFY shape** — строить seam-код сейчас = театр (дефолт-handle журналит НЕзаслуженные trust-метки в append-only лог →
> отравляет retrofit-честность ②; ground truth: всё in-process, аутентифиц. источника личности НЕТ, M5/ViewerResolver не построен).
> Зафиксировано текстом в ADR-0010 §③-bis (proposed): **A≡C растворены** (один механизм, ось = время жизни принципала) ·
> **drop-and-re-stamp** · **`vouched`-деривация** · guardrails **G1** (REFUSE несовпадение, НИКОГДА молча не переписывать `Act.actor`) ·
> **G2** (изоляция = явный prerequisite ③) · **G3** (доверие не растёт по умолчанию). Все 7 ценностей держатся ИМЕННО потому что не строим.
> **🔑 MASTER-РАЗВИЛКА ВЛАДЕЛЬЦУ (несущая, впереди любой стройки): МОДЕЛЬ ИЗОЛЯЦИИ** — ISO-1 in-process / **ISO-2 out-of-process+IPC (шлюз M3 = первый инстанс)** / ISO-3 недовер. транспорт.
> Решает: реальны ли A/C, обязателен ли B, скрытая посылка marketplace. Рек Fable: **ISO-2→ISO-3 как ADR-0011** → M5 под границу → ③ решается почти сам.
> **OWNER PACKET (D1-D4, `04-SYNTHESIS §5`):** D1 ратифицировать дизайн-shape не строить · **D2 выбрать модель изоляции (ADR-0011)** · D3 принять G1-G3 · D4 зафиксировать A≡C. Порядок: D3+D4→D2→M5→enforcement-флип.
>
> **✅ ВОЛНА ИСПОЛНЕНИЯ (2026-08-12, владелец: «запускай, ресурсы есть, параллельно»; D2=ISO-2→ISO-3 принят; 5 агентов, 2 волны, синхронно):**
> — **ADR-0011 написан+верифицирован+доработан** — `../../../architecture/ADR/ADR-0011-agent-isolation-model.md` (proposed): ISO-2→ISO-3,
>   шлюз M3 = первый out-of-process инстанс. Critic-редтим → RATIFY-WITH-EDITS → внесено: **G4** (легитимность владельца-шва =
>   резерв-форма: `seamAuthority`/issuer-of-issuer до кода; «host вызвал stamp()» ≠ авторизация) · **P-1…P-4** гейты флипа (**P-2** блокирует
>   enforcement до линкованного фикса gateway-dup) · **ISO-1.5** (worker/SES-изоляция как альтернатива) · ISO-3 смягчён до provisional endstate.
> — **Порты зашморожены (paper-freeze, PASS независимого reviewer)** — `packages/engine/src/ports/principal-resolver.ts` (+`PrincipalResolver extends
>   ViewerResolver`, `AuthenticatedPrincipal`) · `principal-stamper.ts` (`PrincipalStampResult` refuse-или-stamp = G1 в ФОРМЕ, чинит кривой черновик stamper'а).
>   Zero-behavior, `write()` цел, **187/187 тестов**, tsc чист, Стадия-1 не тронута. НЕ коммичено `⤳[устар. 2026-08-12: порты+ADR закоммичены 3474cd1]`.
> — **Ingest-smell разрешён** (`_shared/topics/03-actor-model/analyses/03-ingest-dedup-smell.analysis.md`): `ingest-rentacar`↔`rental-balance` = **комплементарны, не дубль**
>   (rental-balance зависит от ingest-rentacar); держать оба. Отдельный продуктовый пробел: реальный Sheets-путь не построен (owner-decision «F-D»).
> **⏭ Осталось владельцу/на потом:** судьба Стадии-1 (держу) `⤳[устар. 2026-08-12: в git 3474cd1; FORK-1 схлопнут]` · F2-seed хвост (сцеплен со Стадией-1) · doc-rehome raw 2026-08-11 → топик · M5 (surface-identity под выбранную границу) = следующая крупная работа по секвенсу ADR-0011→M5→③.
> **🚀 ХОЛОДНЫЙ СТАРТ СЛЕДУЮЩЕЙ СЕССИИ:** `../../_log/2026-08-11-trust-plane-principal-seam/HANDOFF.md` (кнопка + план из 5 шагов + хвосты).
> Стадия-1 (частичное ужесточение, 180/180) — uncommitted `⤳[устар. 2026-08-12: закоммичено 3474cd1]`, мердж = отдельный кивок.
>
> ↓ **ОТЛОЖЕНО (availability-lane, резерв):** ПАРАЛЛЕЛЬНАЯ ФАЗА (post-S3) — `../../_log/2026-08-11-S3-prove/LAUNCH-PARALLEL-PHASE.md`.
> ✅ S1 ЗАКРЫТ (2 закона+I-4+R4 ратифицированы, `plans/01-S1-ratify-two-laws/DECISION-READY-PACKET.md`). ✅ S2 ЗАКРЫТ —
> формы заложены в UNIT-SPEC v1.1 (`plans/02-S2-lay-forms/work/S2-critic-gate.critic.md`). **✅ S3 ЗАКРЫТ (2026-08-11) —
> ставка ВСЕГО проекта «память растёт без миграций» ДОКАЗАНА В КОДЕ:** 4 ворот GREEN (2-я форма `time-on-edge` · анти-
> тавтология-мутант КРАСНЫЙ на реальном коде · монумент-атрибуция держится · opaque-edge-id финализирована ПЕРЕ-РЕЗКОЙ).
> **🟢 G2 = GREEN** (сердце готовности). **✅ ЗАКОММИЧЕНО `ccbbb96`** (proof больше НЕ в uncommitted-дереве; recon-1 #1 снят).
> Хендофф: `../../_log/2026-08-11-S3-prove/HANDOFF.md`.
>
> **▶ ПАРАЛЛЕЛЬНАЯ МОДЕЛЬ (2 слоя, связывающее ограничение = ВНИМАНИЕ владельца, не compute):**
> **Слой A** = автономные треки БЕЗ гейта, в изоляции, не тратят внимание — **T3** гигиена доков (doc-only) ·
> **T1a** demo rental-balance на фикстурах (worktree, движок через замороженный `ports/`) · **T4-spike** замер
> hot-path @~100k (read-only, fenced). **Слой B** = ОДИН ствол-решение — **T2 S4-ширина**, гейт = один кивок
> `Q-critical-faces-f3f4` (меню встроено в баттон). **Безопасный max ≈ 2 рулимых трека** (реестр `04` протух за
> 3 недели, когда внимание ушло — evidence). **🔴 T1b/F-D реальные данные НЕ запускаются** (нужен F-D-санкшн;
> R4-default уже ратифицирован, потеря принята — не блокер). **⛔ VETO T5** (файл↔единица) — пере-режет S3-форму.
> Полностью: `LAUNCH-PARALLEL-PHASE.md`. S4 понижен из кампании в СТРАХОВКУ-гейт (`plans/04-S4plus-breadth/README.md`).

> Отдельное состояние ПРОЦЕССА (не содержания): **как** мы соберём всё, что уже наработано, и доведём
> до точки «можно наконец строить память, которая растёт». Владелец (08-04): «спешить нельзя, но
> ресурсов/анализов очень много; нужна тщательная подготовка; 80% ресурсов — на критические 20%».

## Цель состояния
Из горы наработок (перепись 5 областей + fact-base) → **чёткий план выполнения**, который сам НЕ является
стэйтом, а рождает отдельные планы 1..N. Каждый план доводится до «правильной точки», не бросается.
Конечная ценность неизменна: **память-субстрат для агентов, растущая без миграций**.

## Метод прохождения (фазы)
- **Фаза 0 — подготовка (эта сессия, СДЕЛАНО):** заведён этот стейт · fact-base собран · бриф совета готов ·
  хендофф написан. LOSE-NOTHING: все нити связаны ссылками (см. `HANDOFF`).
- **Фаза 1 — СОВЕТ (свежая сессия):** грамотные советники + Fable, **разные линзы**, взвешивают данные,
  смотрят разные проекции, **критикуют → голосуют → дебатируют**, НЕ решают с первой итерации (≥2 круга).
  Выход: чёткий **план выполнения** + разбивка на планы 1..N.
- **Фаза 2 — планы 1..N:** заводятся как под-состояния/планы; растут между собой; **часть строго
  последовательна, часть параллельна** (по разным командам агентов). Каждый — с глубоким «правильным
  началом» (тщательная подготовка прежде исполнения).

## Механика (явно контролируемая)
- **Советники/Fable = явный механизм принятия направления** (council-brief.md). Fable — острые развилки;
  Opus — рабочая структура; дополнительные агенты — разные линзы/дебаты/голосование.
- **Правила команд:** у каждого плана/команды могут быть СВОИ правила взаимодействия, прописанные в его
  под-состоянии (что читать, гейты, кто критик, формат выхода). Это контроль качества на входе.
- **`_shared/`** (служебное) — переиспользуемые состояния/паттерны/снапшоты; планы явно на них ссылаются,
  чтобы наработки не терялись между сессиями. См. `_shared/README.md`.
  - **Пул задач (стейт наполняется отсюда):** `_shared/task-pool.md` · **контракт передачи:** `_shared/HANDOFF.template.md`.
  - **Правила движения+самопроверки:** `../../01-organization/doc-discipline/growth-and-sequencing/CONVENTION-movement-and-selfcheck.md`.
  - **Орган переписи ширины (гейт):** `../../_inbox/2026-08-04-assemble-and-direct/design/02-coverage-gate.synthesis.md`.
- **Управление контекстом:** каждый переход = хендофф, чтобы новая сессия стартовала с МЕНЬШИМ контекстом
  и КОНКРЕТНОЙ задачей. «Формат контекста управляется по многим аспектам» — само по себе предмет плана.

## Принципы качества
- **80/20:** 80% ресурсов — на 20% критических вещей (метод, подготовка, развилки), чтобы исполнение потом
  было дешёвым. Перепроверки, разные проекции, адверсариальность — до, а не после.
- **LOSE-NOTHING:** новее/глубже побеждает как направление, но ничего не стирается (снапшоты/со-размещение).
- **Гибкость на концептах:** концептуальные вещи держим открытыми к пересмотру, не костенеем.

## Кандидаты-направления (strawman для совета — НЕ финал)
Из fact-base. Совет валидирует состав, ПОРЯДОК и что-станет-отдельным-планом:
- **S-A · Ядро зелёное** — программа N-G (условия зелёного, конфликт-пары) + **подключить durable к жизни**
  (сегодня всё на MemoryStore!) + закрыть «канон лжёт» (Витальность=0 кода).
- **S-B · Жилец ga-rentacar** — M2/M3 через обязательный PEP + `same-as`; 4 живых риска.
- **S-C · Агентный слой** — наполнить пустой контракт brain↔agents; 2 бага шлюза (dup/restart, OQ-4 outbox).
- **S-D · Процессная организация** — линейный пульт → **граф веток-карточек**; раскидать «бардак» `_log/`
  и незаведённые ветки; doc-discipline долги. (Этот стейт — первый шаг S-D.)
- **Сквозное:** межценностный **арбитраж 7 ценностей** (развилка владельца, из вердикта Fable) → ADR.

## Путь движения (полосы · порядок · 2026-08-05)
> Правила: `../../01-organization/doc-discipline/growth-and-sequencing/CONVENTION-movement-and-selfcheck.md`.
> Задачи: `_shared/task-pool.md`. Перепись (дыры плана): `../../_inbox/2026-08-04-assemble-and-direct/design/02-coverage-gate.synthesis.md`.
- **S-D stage 1 — СДЕЛАНО:** правила движения + пул + шаблон хендофа + орган переписи (коммит `e306f95`).
  Перепись уже поймала ошибки плана (CG-12 генератор D0 · CG-14 тавтологический same-as guard).
- **Полоса A — «чистый план» — СДЕЛАНО (2026-08-06):** план `01-execution-plan.synthesis.md` пропатчен
  (12 правок), pool/census обновлены. Прогон: co-orch перепись → 4 исследователя → 4 критика (все REVISE) →
  ревизия → харвест-гейт (ACCEPT ×4) → билдер → ревью (PASS). Сырьё: `_inbox/.../design/polosa-a/`.
  Убито: тавтология same-as (2 круга — теперь disk-round-trip падуч), DV-коллизия (DV/DV-graph/D0(b)),
  ложный D0-генератор (→ `T-state-pult-generator`), census-gate-прозой (→ `T-census-check`+`T-census-check-ci`).
  Открыто владельцу: owner:TBD на 3 новых задачах; D0(b) distinct-vs-precursor (хедж, до Wave 3).
- **Полоса B (после A / далее веером) — «копнуть грань»:** одна грань/сессия. Кандидаты: Q5 referent-consent
  (=#15, фундамент Ц7), Q1 recall+Q2 erasure (одна дверь). Прототип — только где перепись зелёная.
- **Параллель:** цепь (A→прототип) последовательно; независимые грани — разные топики; слияние в этом пульте.
- **РЕКОМЕНДАЦИЯ next-stage — APPROVED via gate (2026-08-06):** `_shared/RECOMMENDATION-2026-08-06-next-stage.decision.md`
  — сделать **D1.b несущим = «сломать плоскость»** (by-reference инвариант), втянуть Q2 erasure в D1.b; потом
  Q5 consent. Гейт (3 линзы: architect ГРАНИЦЫ · business ЦЕННОСТЬ · critic АДВЕРСАРИАЛ) → REVISE×3 →
  направление подтверждено, кейстоун закреплён с 9 ужесточениями acceptance (§9 доки).
- **ПЕРЕПИСЬ ШИРИНЫ D1.b — СДЕЛАНО (2026-08-06) → 🟥 ГЕЙТ I2 = БЛОК, «строй» ЗАПРЕЩЁН:**
  `../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/00-width-census.synthesis.md`
  (3 уникальные карты: real-surface · paired-faces · falsifiability → co-orch свёл матрицу 19 граней:
  ✅1 · ⬜2 · 🟥16). Ветка D1.b всё ещё DESIGN. **Три блокера-кейстоуна (роняют ставку):**
  (1) `F6` form-agnostic хребет проверен лишь на ОДНОЙ форме (ga-rentacar) = тавтология CG-14-класса;
  (2) `S10` продуктовый путь пишет через `MemoryStore`, не `DurableFsStore` (`rental-balance/src/surface/cli.ts:26`);
  (3) `§9-3` shred-assert тавтологичен по типу (`erasure.ts:25-34`) — **§9-3 патч применён** в доки-рекомендации.
  Задачи `T-D1b-*` засеяны в `_shared/task-pool.md`. Волны (co-orch реко): 3 синхронные —
  инфраструктура (S10+wire-erasure) → сердце падучести (§9-3/3b+F6) → property fault-injection (§9-4).
- **BUILD Этап 1 (S10+§9-2) — СДЕЛАНО+ВЕРИФИЦИРОВАНО (2026-08-06, «строй» владельца):** помощник(prompter)
  слепил задание → билдер (paттерн swap перенесён из `engine/src/surface/cli.ts:45-49`; `splitAct` подключён
  к `store-durable-fs.ts:41,140`, симметрия `actToLine/lineToAct`) → **2 вектора наблюдения** (reviewer PASS
  0-critical + runtime-verify CONFIRMED: `journal.jsonl` 8 актов на диске, payload физически разведён,
  durable-тесты 10/10, свежая регидратация ОК). Спец: `d1b-width-census/build/stage1-wire-durable.assignment.md`.
  Не коммичено. Хвост: `cli-durable.test.ts` гоняет generic-CLI, реальный ga-rentacar durable-путь без
  коммит-теста → `T-D1b-rental-durable-test`.
- **BUILD Этап 2 (§9-3/3b + F6) — СПЛАНИРОВАН, решение зафиксировано (2026-08-06):** 2 линзы (prompter +
  abstract-thinker). Спец: `d1b-width-census/build/stage2-falsify-plane.assignment.md`. **Решения лида:**
  (1) **ось F6 = `time-on-edge`** (`validFrom/validTo` `types.ts:38-41`) — самая дешёвая ЧЕСТНАЯ фальсификация
  (хребет сам зарезервировал слот + обещал P2 non-breaking); критерий «структурно иного» = грузить ОСЬ ХРЕБТА,
  не payload; тест-на-тавтологию (НЕТ по Q1/Q3) обязателен. (2) §9-3 **требует НОВОЙ продакшн-функции**
  `shredPayload` на диске (`redactAct` сегодня только in-memory, к JSONL не применяется) → `T-D1b-shred-on-disk`,
  держать МИНИМАЛЬНОЙ (перезапись файла; НЕ WAL/атомарность = F3/DEFER). Assert-мутант (`splitAct` роняет
  `edges`) обязан падать. **Готово к сборке — ждёт хода на запуск волны Этапа 2.**
- **BUILD Этап 2 (§9-3/3b + F6) — СОБРАН+ВЕРИФИЦИРОВАН (2026-08-06):** `shredPayload` (prod, `store-durable-fs.ts:226-251`),
  cross-process disk round-trip, мутант красный, лок `same-as` фальсифицирован; 3 линзы (reviewer PASS ·
  critic · runtime CONFIRMED); честностный фикс «payload стёрт»→«inline erasable zone». Волна наблюдения по
  3 граням (Fable+critic на by-ref PII). Хендофф: `../../_log/2026-08-06-d1b-stage2-build-and-fork-review/HANDOFF.md`. Не коммичено.
- **ВЕКТОР ВЛАДЕЛЬЦА (2026-08-06): НЕ строить → раскрутить концепт от ценностей.** 4-линзовая волна
  наблюдения (critic·architect·analyst·abstract-thinker) сошлась: `by-ref hard-erase` — не задача-стройка,
  а **неопределённый концепт + решение класса ADR**; рычаг = ответить, что стирание ЗНАЧИТ, не строить
  глубже. Владелец: не строить, раскрутить до очевидного ИСХОДЯ ИЗ ЦЕННОСТЕЙ, поэтапно, писать в правильные
  места. → 3-линзовая думающая волна приземлилась в **дом концепта**
  `../../02-project/core/01-brain/01-overview/01-values/07-soglasie/05-revocation-erasure/analyses/`
  (`00-SYNTHESIS-what-erasure-means.design.md` — читать первым). **Очевидно:** стирание = ШОВ двух веществ
  (содержимое→несуществует · факт→монумент), не точка; admission-gate R1 (no-real-PII) вынужден ценностью;
  честный СТОП = Стадия-1 (недостижимо+tombstone+порт `PayloadStore`). Развилки владельцу: OQ-A..D (в синтезе).
- **ORCHESTRATED DESIGN PUSH (2026-08-08, 5 синхронных волн ~13 агентов, file-first, критик-перед-готово):**
  `../../_log/2026-08-08-orchestrated-design-push/HANDOFF.md`. Двинули БЕЗ строй/решений: D1 readiness (honest
  **~30-40% ready-to-build**, не 80%; census=truer breadth 🟥) · D2 валидация UNIT-SPEC (5 патчей, spec не тронут;
  **F1 read-PEP = canon-lie**) · D3 F6 falsification → **REQUIRES-SPECIAL-CASING** (пойман на бумаге до стройки) ·
  D4 decision-lens брифы (I-4·R3·R4·R5; **OQ-D переоткрыт**) · D5 tension файл↔единица (N-020 vs §5). Wave-5:
  F1 **deref-seam retrofit-невозможен** · F6 **recoverable через reify-to-unit**. Всё сведено в
  `synthesis/SPEC-DELTA-DOCKET.md` (патчи UNIT-SPEC по §). Развилки владельцу — там же в формате линз. НЕ коммичено.
- **DIRECTION к готовности (2026-08-08, валидирован critic+abstract-thinker):**
  `../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md`. Свёрнуто в **2 закона:**
  ①форма-retrofit-невозможна/политика-дешева · ②юнит-статус зарабатывается жизненным циклом (promotion-предикат =
  файл↔единица+монумент+N-020+ребро-состояние, keystone НЕ отложенный). Готовность=G1-G5 (формы·хребет·честность·
  форки·ширина); honest ready **~30-40%**. Путь: **S1 ратифицировать 2 закона+I-4 → S2 заложить формы (провизорно) →
  S3 доказать ставку (promotion на 2-й форме) → S4+ ширина.** Оценка **5-8 сессий, правдиво 8-14** (концепты переоткрываются).
  Двигать СЕЙЧАС = S1. ⚠️ pre-S4 ратифицировать список «критических 20% граней».
- **АВТОНОМНЫЙ НОЧНОЙ ПРОГОН «autonomous-question-closure» (2026-08-09, 9 итераций = 7+2 продолжение, владелец спал):**
  `../../_log/2026-08-09-autonomous-question-closure/HANDOFF.md` (закрытие + §continuation) · `RUN-INDEX.md`
  (живая таблица 14 нод) · `_shared/OWNER-MORNING-PACKET.md` (**читать владельцу первым** — 8 решений по срочности).
  Каждый открытый вопрос/форк вырос в свою growth-ноду (суть+анализ+критик-до-готово+синтез), закрыт ИЛИ
  ушёл владельцу линзой. Ключевое: G2 (хребет на 2-й форме) весь прогон остался 🟥 — ночь СУЗИЛА S3, не
  заменила его; критическая находка итерации 7 (`g1-missing-form`) — список retrofit-невозможных форм в
  тексте S1 может быть НЕПОЛОН (valid-time/as-of, CRIT-1) — блокирует дальнейшее рисование S2-форм до
  ответа владельца. S1/S2/S3/S4 статусы НЕ изменились (`blocked-by` цепочка та же) — прогон подготовил
  решения, не принял их за владельца.
  - **Продолжение итер.8-9 (опоры доверия):** U3-actor-model (модель ролей = 2 контракта; интегрити-дефект
    write-PEP не подключён) + U6-threat-model (**adjudicated missing-FORM = только F1 write-principal-seam +
    F2 data-subject-binding — СХОЖДЕНИЕ с итер.8, новых retrofit-невозможных форм нет**; позитив 80/20). Новый
    owner-форк FORK-U3 🟡 (`OWNER-QUEUE.md`). ⭐ 2 эксплуатируемых СЕГОДНЯ бага провенанса (grant-forgery
    read-path · policy-node overwrite) — агент-починяемы, dev/test-only под R1-забором, в `task-pool.md`
    (`T-grant-forgery`/`T-policy-node-provenance` + `T-write-pep-unwired` = 3 грани code-vs-invariant divergence).
    Автономная очередь НЕ исчерпана (U5/U7/truth-spawned) → петля продолжается с итер.10.
  - **⭐ СТРАТЕГ-ВОЛНА итер.10 (заказ владельца, 4 линзы+критик, 2026-08-09):**
    `_shared/topics/05-strategy-path-and-next/synthesis/01-STRATEGY-HANDOFF.synthesis.md` (CLEAN). Единогласно:
    тормоз = 8 owner-форков + нет «строй», НЕ анализ (10 итер = 0 сдвинутых ворот). **Ключевая цель названа:**
    доверяемое делегирование, ограниченное на развилке; память = полигон; процесс = первый экземпляр продукта.
    **WIP-гейт:** «сдвинул ворота или не считается» → анализ-итерации СТОП. **Следующая сессия (отрезана) = S1:**
    патч текста-под-подпись (Q-G1-scope вар.Б: Instance-1 CRIT-1 + Instance-4 valid-time) + освежить
    `OWNER-MORNING-PACKET.md` decide-ready-форками (Q-Law2/F6-A/L1dom/critical-faces/FORK-U3/R3) + опц. 1 dev-баг
    по «строй». **Стандарт сейчас НЕ писать** (n=0=прокрастинация, evidence-before-promotion) → консолидация
    MACHINERY→`_shared/` + 1 правило в SESSION-CONTROL, полный стандарт ПОСЛЕ первого прогона S1. Ждёт go владельца + сверку цели.
- **✅ S1 · S2 · S3 ИСПОЛНЕНЫ (прогон 2026-08-09…08-11):** S1 ратифицировал 2 закона+I-4+R4 · S2 заложил формы
  (UNIT-SPEC v1.1) · **S3 (2026-08-11) ДОКАЗАЛ ставку в коде** — первый WIP-гейт СДВИНУТ (G2 🔴→🟢), n>0. 4 ворот
  GREEN, байт-верифицированы, reviewer перепрогнал независимо: (1) хребет выжил на 2-й СТРУКТУРНОЙ форме
  `time-on-edge` (residual=2 сосуществующих ребра, ZERO type-delta, `second-form-spine.test.ts`, suite 92→104);
  (2) анти-тавтология-мутант КРАСНЫЙ на РЕАЛЬНОМ коде (M1 срезает `validFrom/validTo` `predicates.ts:110,114,115`;
  `:110`-gap закрыт волной 4); (3) монумент-с-атрибуцией держится, non-vacuous (M3→leaked=1 RED);
  (4) opaque-edge-id ФИНАЛИЗИРОВАНА **честной ПЕРЕ-РЕЗКОЙ** — буквальный `edgeId` отклонён (сам=миграция),
  `supersedes`-на-Act отклонён (delete-history), реализовано через зарезервированные `validFrom/validTo`+
  cardinality-as-data. Migration-линия ратифицирована (фальсификатор живёт на FOLD-слое, не read). НЕ коммичено.
  Хендофф: `../../_log/2026-08-11-S3-prove/HANDOFF.md` (детали волн — та же папка). **→ S4+ (ширина) РАЗБЛОКИРОВАН.**

## Ворота состояния
- [x] Фаза 0 — стейт + fact-base + бриф совета + хендофф (LOSE-NOTHING)
- [x] Фаза 1 — совет провёл ≥2 круга (5 линз → реконсиляция → критика + Fable) → **план выполнения**:
      `../../_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md` (status: review).
      Сырьё совета: `.../design/council/` (wave1 ×5 · wave2 draft/critique/fable). Хендофф:
      `../../_log/2026-08-05-council-executed/HANDOFF.md`.
- [x] S-D stage 1 — механизм движения (правила+пул+шаблон+перепись) материализован (коммит `e306f95`)
- [x] Полоса A — «чистый план»: 4 ошибки постановки (CG-11/12/13/14) убиты, план пропатчен + проверен (PASS, 2026-08-06)
- [x] Гейт next-stage + перепись ширины D1.b (2026-08-06): направление подтверждено (REVISE×3), кейстоун закреплён,
      ширина = 🟥 БЛОК (16/19 граней пусты) → «строй» D1.b запрещён, ветка ещё DESIGN
- [x] Закрыть 3 блокера-кейстоуна D1.b (F6 второй формат · S10 DurableFsStore на реальном пути · §9-3 независимый снимок) — **ЗАКРЫТЫ:** S10+§9-2/9-3 в Этапах 1-2 (2026-08-06); **F6 второй формат ДОКАЗАН в S3** (`time-on-edge`, анти-тавтология, `../../_log/2026-08-11-S3-prove/HANDOFF.md`)
- [~] Фаза 2 — планы S1..S4 ЗАВЕДЕНЫ + контракт прогона (SESSION-CONTROL) — материализованы (`plans/` узлы-папки S1-S4 + `_shared/SESSION-CONTROL.md`), НЕ исполнены; ждут «строй»/развилок владельца на S1. Карта планов: `plans/INDEX.md` · контракт: `_shared/SESSION-CONTROL.md`.
  **▶ ЗАПУСК СЛЕДУЮЩЕЙ СЕССИИ (S1): `../../_log/2026-08-08-orchestrated-design-push/LAUNCH-S1.md`** (cold-start баттон) · экономия/нагрузка/бюджет: `_shared/ECONOMY-PLAYBOOK.md`.
- [ ] Каждый план доведён до «правильной точки» (не брошен)
