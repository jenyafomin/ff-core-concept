---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: spec-draft
Related:
  - ../../../../analyses/2026-07-12-architecture-synthesis/2026-07-12-COMPLETENESS-and-model.md   # §6 — дыра забвения
  - ../../../../02-infrastructure/04-modules/M-G4-locality-residency/README.md   # материализация live/cache/copy, DataResidency
  - D4-rebuild-reconcile-owner/EXPLAIN.md   # долг движка, поток снизу-вверх
  - ../05-revocation-erasure/README.md   # soft-sleep vs hard-erase, FQ7
  - ../../../../02-infrastructure/04-modules/M-G1-memory-engine/README.md   # integrity-as-engine-duty
---

# SPEC-DRAFT — Механизм забвения (soft-sleep + hard-erase)

## Проблема
soft-sleep (снижение salience) и hard-erase (безусловное стирание) проработаны в ценности Ц-7, но
**не на инженерном слое**. Субстрат — append-only журнал + материализации (live/cache/copy) + реплики +
эмбеддинги + производные виды. «Стереть узел ВЕЗДЕ» текущей схемой нереализуемо: append-only не удаляет,
а payload расходится по кэшам/копиям/индексам без обратного адреса. Право референта на забвение (Г20) не
исполнимо. 🔴 архитектурная дыра из COMPLETENESS §6.

## Цели / Non-goals
**Цели:** (1) два раздельных примитива — обратимый soft-sleep и необратимый hard-erase; (2) hard-erase как
**долг движка**, распространяемый по `DataResidency` на все материализации/реплики/эмбеддинги; (3) примирить
append-only и «стереть везде» через tombstone + физический purge payload; (4) consent Ц-7 как триггер и
провенанс удаления. **Non-goals:** рутинное забывание по витальности (Ц-4 метаболизм); аудит сокрытия (07.06);
UI горизонта отзыва; кросс-тенант federation-purge (🟢 позже).

## Требования
- **R1 · soft-sleep = salience-policy.** Обратимо: `salience→0`, bitemporal хранит историю («забыть ≠ удалить»).
  Payload и рёбра целы. Policy-узел (M-G3), не трогает журнал. Дефолт при отзыве согласия без явного «сотри».
- **R2 · hard-erase = долг движка.** Необратимое уничтожение payload узла И всех производных. Не policy-настройка —
  встроенная обязанность M-G1 (как дедуп/anti-cycle), в 🔴-списке integrity-as-engine-duty.
- **R3 · Распространение по DataResidency.** Движок читает `residency-record` (`canonicalId`) → обходит каждую
  материализацию: home-payload purge; `cached-from`-DAG инвалидация; `replica-of`-DAG purge реплик; вычистка
  эмбеддингов/индексов; пересчёт производных видов (`derived`). Обход — по адресам control-plane, не по угадыванию.
- **R4 · append-only ⨯ стирание — через tombstone.** Журнал НЕ переписывается: пишется терминальное событие
  `erased`. Payload физически purge; на `canonicalId` остаётся **tombstone-надгробие** — id-пустышка + факт
  «здесь было, стёрто по требованию, когда, кем», рёбра целы (Ц-2, ссылки не рвутся). Факт-надгробие неудаляем.
- **R5 · consent Ц-7 как триггер + провенанс.** hard-erase инициируется отзывом согласия референта/владельца
  (безусловность референта). Событие `erased` несёт провенанс: инициатор, основание (consent-revoke), scope
  каскада, таймстемп. Каскад на потомков (обратный consent-taint, 07.04) — параметр (⚠ открыто, FQ7/развилка 3).
- **R6 · SLA исполнения.** Синхронно по требованию для home-payload; фон с гарантированным SLA-сроком для
  реплик/эмбеддингов (окно видимости после отзыва ограничено и измеримо).

## Критерии приёмки
- A1: soft-sleep обратим — узел скрыт (`salience=0`), payload восстановим, история bitemporal цела.
- A2: после hard-erase payload узла отсутствует в home-store, кэшах, копиях, репликах и эмбеддинг-индексе.
- A3: tombstone на `canonicalId` присутствует; входящие рёбра не разорваны; факт-надгробие неудаляем.
- A4: событие `erased` несёт полный провенанс (кто/когда/основание/scope).
- A5: rebuild-from-scratch (D4/M-G4) НЕ воскрешает стёртый payload из журнала.

## План верификации
- **T1 (главный):** создать узел с материализациями live+cache+copy+эмбеддинг → hard-erase → assert: payload
  отсутствует во ВСЕХ материализациях/реплике/эмбеддинге; tombstone+рёбра остаются; провенанс записан.
- **T2:** soft-sleep → assert обратимость + сохранность журнала; затем hard-erase → assert необратимость.
- **T3:** rebuild-from-scratch после erase → стёртый payload не возрождается (терминальность `erased`).
- **T4:** consent-revoke триггерит hard-erase; каскад на потомков по параметру.
- **T5:** SLA — реплики/эмбеддинги вычищены в пределах заявленного окна.
