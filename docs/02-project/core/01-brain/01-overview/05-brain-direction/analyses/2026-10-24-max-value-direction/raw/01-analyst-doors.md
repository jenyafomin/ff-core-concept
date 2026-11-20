# 01 Analyst: двери ff-brain (2026-10-24)
Вопрос-цель: через какие двери память читается/пишется и какой двери не хватает сильнее всего.
Потребитель: свод max-value-direction. Поглощает: ничего.

## Двери (по коду, не по докам)
| Дверь | Кто | Чт/Зап | Статус |
|---|---|---|---|
| HTTP по unix-сокету `packages/brain/src/service/http.ts:131-141` (record/find/read/link/health/stats/export/lens) | сервис, клиенты | оба | работает (pm2 ff-brain) |
| CLI `packages/brain/src/bin/ff-brain.ts:12` (health/stats/export) | владелец | чтение (метрики, JSON-выгрузка) | работает |
| MCP `packages/brain-mcp/src/server.ts:1` (4 тула record/find/read/link) | агент | оба | собрано; в шлюзе OFF (флаг GATEWAY_BRAIN_MCP + `pm2 restart agent` не сделаны, state.md W21) |
| Шлюз: `agents-manager/src/server/orchestration/brain-client.ts` + `prompt-layer-importer.ts` (импорт PROMPT.md в мозг) | шлюз | запись | работает как импорт; `GATEWAY_PROMPT_SOURCE=shadow` — только теневое сравнение, источник `brain` не включён (`core/ports/prompt-source.interface.ts:12`) |
| Lens compose `packages/brain/src/read/lens.ts:1` (сборка промпта из слоёв) | шлюз | чтение | собрано, не источник промпта |
| `packages/gw-reader` (read-only MCP над SQLite-логом шлюза: gw_recent/resolve/topics/label) | агент топика | чтение ЛОГА, пишет только свои метки | собрано, не включено; это дверь в лог, не в мозг |
| Скиллы ff-brain-use / ff-brain-build | агент | инструкции | experimental; работают только при наличии MCP |

Факт: единственный путь, где человек видит содержимое памяти, — `ff-brain export` в терминале. Агент в живом топике пока не читает (MCP не включён).

## Каких дверей нет
1. Человек читает память в Telegram — нет.
2. Веб-фронт — нет (ни кода, ни ADR; W3/W24 — только preset root/overview, текст для агента).
3. Экспорт в md/Obsidian — нет (export = JSON).
4. Авто-запись из сессий — нет (W5 «логи в мозг» заблокирован ротацией паролей W10; пишет только агент по своему решению).
5. Другие пользователи/проекты — нет (W6/W25, Э3; согласие V7 не форсится).

## Переиспользуемое в шлюзе (главная находка)
`agents-manager/src/channel-telegram/browser/` — движки без хранения состояния (state в первой строке сообщения): `file-browser.ts` (листинг, пагинация, «красиво» через `render-rich.util.ts`), `tree/` (карта-дерево с глубиной), `find-card.util.ts` (карточка-список результатов кнопками), `wizard/` и `pult/` (концепт-визард, пульт). Канало-агностичны; источник — через `resolveProjectFile`. Мини-аппов и веба нет.
Адаптер «мозг как виртуальная ФС»: scope = каталог, type = подкаталог, запись = файл; источник — `find{scope,type,limit}` и `read` через brain-client.

## Самое дешёвое с максимальной отдачей
`/memory` в шлюзе = find-card + tree поверх find/read brain-client (read-only, права по caller, как у MCP). Цена: один адаптер источника + одна команда; без нового UI, без записи, без PG и без W10. Отдача: владелец впервые видит, что агенты пишут в память; это же даёт вход для метрик надёжности (W7). Второй шаг почти бесплатно: export -> md-папка по scope/type (read-only скрипт), открывается в Obsidian и в `/files`.
Предусловие обоих: включить MCP (W21), иначе живых записей почти нет.

Итог: ответил — самая слабая дверь «человек читает память» (Telegram), закрывается переиспользованием файл-браузера шлюза.
