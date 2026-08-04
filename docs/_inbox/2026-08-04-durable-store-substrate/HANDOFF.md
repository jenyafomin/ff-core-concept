---
node_type: handoff
title: "HANDOFF — durable-store субстрат: построено + хвост + открытые идеи"
status: active
topic: durable-store-substrate
owner: jenya.stasik@gmail.com
date: 2026-08-04
kind: trace
related:
  - ./README.md
  - ./councils/2026-08-04-S7-durable-store/SYNTHESIS.md
  - ./questions/OQ-open-decisions.question.md
  - docs/_log/2026-08-01-docs-as-memory-and-tidy/HANDOFF.md
---

# HANDOFF — durable-store субстрат (S7)

> Для СЛЕДУЮЩЕЙ сессии. Начать НОВУЮ тему с чистым контекстом (не тащить прошлые токены).
> Метод следующего раунда: проработать открытые вопросы/идеи волнами свежих агентов → гейт → синтез.

## 0. Read-first при холодном старте
1. Этот файл.
2. `./councils/2026-08-04-S7-durable-store/SYNTHESIS.md` — полный синтез волны (факты + R1–R6).
3. `./questions/OQ-open-decisions.question.md` — что владельцу решать.
4. Код-истина: `packages/engine/src/adapters/store-durable-fs.ts` + тесты `packages/engine/test/{survive-turn,durable-reboot-matrix,crash-mid-turn,cli-durable}.test.ts`.
5. Канон: `docs/architecture/ADR/ADR-0006` (persistence-as-policy) · `ADR-0008` (log/graph CQRS) · `core/00-kernel/invariants.md` (I-5/I-11).

## 1. Ключевой факт (не переизобретать!)
**S7 durable StorePort — ЯДРО УЖЕ ПОСТРОЕНО и запечатано** до этой сессии: коммит `b881212 seal GAP 1`,
предок HEAD. `DurableFsStore`: fsync JSONL-журнал (= система-записи, ADR-0008), rebuild-from-journal на boot,
идемпотентность через ребут, single-writer PID-lock, drop оборванного хвоста. OQ-1(sync|async) решён кодом = sync.
Ранее доки (STATE, design, spec) ЛГАЛИ, что это ещё не сделано → чуть не пошли строить заново. Доки поправлены.

## 2. Что сделано ЭТОЙ сессией (2026-08-04) — всё зелёное, закоммичено без GPG
Волна из 4 строящих команд, непересекающиеся файлы, engine-сьют **77/77 pass, typecheck чист**:
- **R1 — durable-store провязан в живой раннер.** `cli.ts`: флаги `--store <memory|durable>` + `--store-dir`
  (default gitignored `.store/`). E2E: один процесс пишет акт → fsync → ОТДЕЛЬНЫЙ CLI-процесс читает с диска.
  → Ц1 «память навсегда» переведена из «зелено в юните» в «зелено на слое продукта».
- **R3 — crash-mid-turn проверен адверсариально** (реальный SIGKILL + torn-write + stale-lock). Вердикт:
  журнал ВЫЖИВАЕТ (хвост дропается, зафsyncанные акты целы, партиал-батча нет, мёртвый lock переклаймится).
  Оставил открытым: OQ-2 PID-reuse.
- **R2 — file-first «перо» (минимальный срез)** в `store-md.ts`: `ingest()` диффит md по sha256 → file-first
  акт; `detectStale()` = staleness-маркер (правишь .md руками → журнал теперь узнаёт). Дизайн-шов M3 оставлен
  открытым (OQ-3, OQ-6).
- **Доки-реконсиляция:** STATE.md, durable-storeport.design.md (draft→active), spec/07 (→superseded редиректом,
  не удалён), ADR-DRAFT, kernel INDEX — приведены к коду.

## 3. Хвост durable-store (ранжировано) — что осталось
- **R4 🟠** batch/turn-идемпотентность + egress-outbox (OQ-4) — НЕ строили (риск конфликта с store-core). Отдельной волной.
- **R6 🟡** retention журнала (рост observation/trace без обрезки; full replay на каждый ход) — не срочно, снапшот+хвост аддитивен.
- Решения владельца: OQ-1…OQ-6 (см. questions/).

## 4. Шире, чем durable-store (голос владельца 08-01, ещё НЕ проработано)
Владелец хочет «минут проработать разные вопросы, разные идеи». Кандидаты в темы:
само-апгрейд (под клапаном vs автономный) · пересборка папок-в-папках (docs-дерево vs граф) ·
«клиент»/n8n-тулкит (3 прочтения) · policy-scope (project/universal). Детали — `questions/` §Шире + `_log/2026-08-01-.../HANDOFF.md`.

## 5. Несущая абстракция (языком владельца)
Субстрат помнит навсегда РОВНО ОДНУ вещь — **ленту того, что случилось** (журнал актов). Граф, файлы,
ветки, кэш, слои — всё он ЗАНОВО сворачивает из ленты `fold(journal)` под вопрос.
**Durable = сделай ленту несгораемой; всё foldable держи дешёвым и производным.**

## 6. Правила размещения (усвоено 08-04)
Сырьё многогранной работы = **тема-папка в `_inbox`** с контейнерами `councils/ questions/ analyses/ decisions/`
(НЕ россыпью в `docs/council/`). Тема созревает → переезжает в постоянный дом. Trace/хендофф — указатели, истина по ссылкам.
