# Ревью: @ff/gw-reader + ADR-0018

- **Status:** review · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-12
- **Потребитель:** лид · **Поглощает:** ничего
- **Вопрос-цель:** выдерживает ли читатель 8 критериев приёмки (03-critic-build) и годен ли к подключению в пробный топик?
- **Опора:** `packages/gw-reader/src/*`, `docs/architecture/ADR/ADR-0018-gateway-log-reader.md`, `03-critic-build.analysis.md`.

## Вердикт: PASS (с оговорками — 0 blocker, 2 major, 5 minor)

## Доказательства
- `npm run typecheck -w @ff/gw-reader` — чисто (src + test). `npx vitest run` — 3 файла, 39/39 зелёные. `npm run build -w @ff/gw-reader` — dist собран. Не коммичено, шлюз не тронут (`git status`: только новые `packages/gw-reader/`, ADR-0018).
- (1) read-only: `reader.ts:61-63` `new DatabaseSync(path,{readOnly:true})` + `PRAGMA query_only=ON`; все SQL — один SELECT (`reader.ts:96`), параметризован. Путей записи в БД нет. Запись только `labels.ts:25-26` в свой JSONL (0o600/0o700).
- (2) Все выходы идут через `toView` → `redactText` (`reader.ts:114`): recent, resolve, topics (без текста). Поиск `reader.ts:166-168` по уже скрытому тексту — оракула нет. Заметки меток: `server.ts:117` и `:134` редактируются на записи и чтении. Обхода не нашёл.
- (3) Не владелец и не `in` исключены в SQL (`reader.ts:90-93`); forward — маркер `[Пересланное сообщение` в любом месте + запасная регулярка (`reader.ts:75`). Маркер сверен с `normalize-inbound.util.spec.ts:75`. Неразбираемый sessionKey отбрасывается (`address.ts:36-48`).
- (4) Адрес `gw:<sha256[:6]>/t/m`, chat id в открытом виде нет; два чата с одним thread -> `ambiguous` (`reader.ts:187`).
- (5) stderr — только счётчики (`server.ts:55`); тел в логах нет.
- (6) zod: days ≤30, limit ≤200, query ≤200, note ≤500, enum меток. `GW_READER_LABELS` задаёт оператор через env, не модель -> path-инъекции модели нет.
- (9) ADR: Context/Decision/Alternatives/Consequences/Validation есть, шапка полная.

## Находки
**major**
- M1 `redact.ts:20-37` (эвристика): пропускаются секреты без ключевого слова + разделителя: `password is correcthorsebattery`, `мой пин 4821`, `код доступа 482915`, `parol qwerty123`, `Wi-Fi: HomeNet / hunter2xyz`, `sk_live_...`; `пароль\n\nsecret123` (пустая строка между — скрыты две строки, значение пропущено). Критерий 2 по списку (amqp/пароль:/token=) выполнен, но заявленное «fail-closed» верно только для форм с разделителем. Фикс: слова-связки (is/это/у меня) и числовые PIN/коды после ключевых слов; skip пустых строк в `KW_TRAILING`; задокументировать как известный пробел в ADR Consequences.
- M2 `server.ts` + ADR D5: область задаёт агент аргументом, читатель виден всем сессиям cwd (ADR признаёт). Подключать только в отдельном cwd одного топика, как в ADR; allowlist — до расширения.

**minor**
- m1 `package.json:36` zod `^3.25` против `^4.0.0` в `packages/brain-mcp/package.json` — расхождение со стилем/дубль версий в монорепо.
- m2 `reader.ts:96` выборка без SQL LIMIT: все строки окна ≤30 дней грузятся в память, лимит применяется после фильтров. Допустимо при текущих объёмах; добавить потолок строк.
- m3 `server.ts:111-113` в метку пишется `address` как передан (с пробелами/регистром), а не канонический `formatAddress` -> один адрес может получить две метки. Писать канонический.
- m4 `labels.ts:42` читает файл целиком и подхватывает `address` без валидации формата; безвредно, но нет проверки ADDRESS_RE.
- m5 Смоук `smoke:live` не запускал (чтение живой БД шлюза вне объёма ревью); критерий 6/8 (git status чекаута до/после, рестарт) — на лиде/владельце при подключении. `node:sqlite` печатает ExperimentalWarning в stderr (в ADR отмечено).

## Итог: решение — PASS; подключать в один пробный топик, M1 внести в план (задача), M2 держать ограничением.
