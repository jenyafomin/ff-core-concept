# @ff/gw-reader — читатель над логом шлюза (read-only MCP)

- **Status:** experimental · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-12
- **Решение:** `docs/architecture/ADR/ADR-0018-gateway-log-reader.md` (proposed)
- **Потребитель:** агент топика под шлюзом «Движ» (через `.mcp.json` в cwd топика) · **Поглощает:** ничего

stdio MCP-сервер, который **только читает** SQLite-лог шлюза (`messages`) и отдаёт модели
выдержки сообщений владельца — после фильтров. Шлюз не трогается, кода в шлюзе нет.

## Что отдаёт

| Тул | Вход | Выход |
|---|---|---|
| `gw_recent` | `days` ≤30 (14), `topic?`, `limit` ≤200 (50), `query?` | `[{address, ts, topic, text_excerpt ≤300, redacted}]` |
| `gw_resolve` | `address` | одно сообщение (тот же фильтр) |
| `gw_topics` | `days?` | `[{topic, chat_alias, thread, count, last_ts}]` — без текста |
| `gw_label` | `address`, `label: open\|closed\|mute`, `note?` | пишет в СВОЙ журнал меток (append-only) |
| `gw_labels` | — | текущие метки (последняя по адресу побеждает) |

**Адрес:** `gw:<chatAlias>/t<thread>/m<channelMessageId>`, `chatAlias` = первые 6 hex `sha256(chatId)`,
`t0` = чат без топиков. `topic` в `gw_recent`: `gw:<alias>/t<N>` (из `gw_topics`) или `t<N>` (тред во всех чатах).

## Фильтры (fail-closed, до выдачи модели)

1. Только `direction='in'`, `userId = GW_READER_OWNER_ID`, есть `channelMessageId`, известная форма `sessionKey`.
2. Пересланное исключается: маркер `[Пересланное сообщение` где угодно в тексте (префикс шлюза,
   `agents-manager/src/channel-telegram/ingress/normalize-inbound.util.ts:130`). Известный пробел: цитата
   чужого текста в ответе владельца маркера не несёт.
3. Секреты — построчно: строка заменяется на `[строка скрыта: возможный секрет]`, `redacted: true`
   (URI с кредами, пароль/password/token/токен/secret/api key/ключ доступа/bearer + значение, PEM-блоки,
   hex/base64 ≥32, `sk-`/`ghp_`/`xox*-`/`glpat-`/AKIA/JWT/токен бота, `user@host` + пароль рядом).
   Сильное слово (пароль/пасс/pw/parol/опечатки/leet/seed-фраза/CVV) скрывает строку целиком, следующие
   2 непустые строки и следующее сообщение того же топика в пределах 10 мин (`CARRY_MS`). Плюс
   ip:порт:логин:пароль, `-pXXX`/`--password=`, `x / y` рядом с root/admin/логин, карты по Luhn.
   Ред-тим-фикстуры: `test/fixtures/redteam.ts`. Известные пробелы — ADR-0018.
   Поиск `query` идёт по уже скрытому тексту — не оракул. Заметки меток тоже фильтруются.
4. stderr — только счётчики (`gw-reader: gw_recent n=5 redacted=1`), тел нет.

БД открывается на каждый вызов `node:sqlite` с `readOnly: true` + `PRAGMA query_only=ON` и закрывается.
Нужен Node ≥ 22.5 (без нативной сборки).

## Env

| Переменная | Дефолт |
|---|---|
| `GW_READER_DB` | `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/data/gateway-ff-personal.db` |
| `GW_READER_OWNER_ID` | `1112667160` |
| `GW_READER_LABELS` | `~/.ff-gw-reader/labels.jsonl` |

## Как подключить (ПРИМЕР — не подключено; делает лид после ревью)

Сборка: `npm run build -w @ff/gw-reader`. Затем `.mcp.json` в cwd ОДНОГО пробного топика:

```json
{
  "mcpServers": {
    "gw-reader": {
      "command": "node",
      "args": [
        "--no-warnings",
        "/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/gw-reader/dist/index.js"
      ],
      "env": { "GW_READER_OWNER_ID": "1112667160" }
    }
  }
}
```

Плюс разрешение в `.claude/settings.local.json` того же cwd: `"enabledMcpjsonServers": ["gw-reader"]`
и allow `mcp__gw-reader__*` (иначе шлюз покажет владельцу кнопку на каждый вызов). Проверить на смоуке.

## Проверка

```bash
npm run typecheck -w @ff/gw-reader
npm test -w @ff/gw-reader            # только tmp-фикстуры, живую БД не трогает
npm run smoke:live -w @ff/gw-reader  # живая БД read-only, печатает ТОЛЬКО счётчики
```
