---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
Related:
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
---

# БАГ шлюза: дубль голосового сообщения (регулярная проблема)

> Приоритет: **высокий, к починке.** Проявляется постоянно, мешает работе. Место починки —
> шлюз `agents-manager` (`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`).

## Симптомы (два)
1. **Убивает фоновых агентов.** Приход дубля = новый ход `claude -p --resume`, который обрывает
   запущенные в фоне суб-агенты. За одну сессию 2026-07-06 убило агентов **4 раза**.
2. **На дубль нет ответа.** Одинаковое сообщение приходит второй раз; ход часто закрывается как
   «No response requested» → владельцу кажется, что ассистент молчит/игнорирует.

## Причина (гипотеза)
Шлюз повторно доставляет одно и то же голосовое (нет дедупликации входящих). Каждая доставка =
отдельный ход, который прерывает текущую работу.

## Обход (пока баг жив)
- Тяжёлую работу вести **синхронно** (не в фоне) — короткими шагами.
- Результаты писать в файлы **по частям** (раздел готов → сохранён), чтобы обрыв не стирал прогресс.
- Фоновых агентов при обрыве — **resume** (SendMessage по agentId), не с нуля.
- Увидел повтор → сразу сказать владельцу, не крутить вхолостую.

## Настоящая починка (TODO для шлюза)
- Дедуп входящих: игнорировать идентичное сообщение, пришедшее подряд (хеш текста + окно времени).
- Не обрывать активные фоновые задачи при новом ходе (очередь/локи вместо kill).

## Update 2026-08-12 — dedup landed, only crash-window remains
> **Факт-коррекция (аддитивно; текст выше — исторический, НЕ удалён).** Диагноз «нет дедупликации
> входящих» (§Причина) теперь **УСТАРЕЛ как корневая причина.** Дедуп УЖЕ починен в шлюзе.

- **Что изменилось:** в `agents-manager` дедуп входящих реализован — `orchestrator.ts:79-88` строит
  ключ `channel:conversationId:messageId` и зовёт `DedupStore.markIfNew()` (in-memory `Set` +
  durable SQLite `SeenUpdate`, гидратируется до старта бота). Коммит `3e3327d` (2026-07-07, «F11»),
  на `main` и `feat/sdk-runner`. Это **новее** всех исторических записей этого бага (2026-07-05/06).
- **Остаточный узкий баг (не корень, а окно гонки):** `dedup-store.ts:41-56` помечает ключ в памяти
  синхронно, но персистит fire-and-forget (`void this.persist(key)`). Крэш ДО flush → новый процесс
  с пустым `Set`, строки в SQLite ещё нет → long-poll передоставляет апдейт → `markIfNew()` вернёт
  `true` → тот же месседж = второй ход. Downstream-бэкстопа нет. Наблюдалось: **7 рестартов за 35ч**
  под pm2 (crash-adjacent `ECONNRESET`/`Connection closed mid-response`), прямой репро дубля не
  зафиксирован — открытый пункт репро-плана.
- **Итог (⤳ устар. 2026-08-13, см. Update ниже):** ~~P-2 в основном закрыт; это больше НЕ «длинный
  полюс» критического пути~~. Остаётся закрыть fire-and-forget-окно (await persist ИЛИ duplicate-insert
  guard в `message.repo`) или доказать отсутствие рецидива.
- **Полный бриф (не дублировать здесь — это указатель):**
  `docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/decisions/WORKORDER-gateway-dup-P2.decision.md`
  (симптом · file:line-улики A/B/C · fix-подход · репро/верификация · linkage к trust-line/decision-③).

## Update 2026-08-13 — verified correction: P-2 RE-ESCALATED (OPEN), fix in progress (not landed)

> **Коррекция к «Update 2026-08-12» выше (аддитивно, LOSE-NOTHING — текст выше не удалён, был честным
> снимком на свой момент).** Адверсариал по ГОЛОСОВОМУ пути показал: остаточное crash-window §"Остаточный
> узкий баг" выше — НЕ гипотетическое, а корень **живого симптома дубля**, который владелец наблюдает
> (дедуп срабатывает лишь ПОСЛЕ ≤5-мин транскрипции, `telegram-channel.ts:449-470`; polling-offset grammY
> в памяти, `bot.js:81,192,421`). **P-2 статус = OPEN**, снова длинный/named полюс на пути M0/M5 (не
> "почти закрыт"). Разбор: `WORKORDER-gateway-dup-P2.decision.md` §"Verified correction 2026-08-12";
> детальный how-to фикса: `docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/tracks/05-gateway-dup/01-how-to-implement.design.md`.

- **Фикс ведётся, НЕ смёрджен.** Ветка `fix/p2-voice-dedup-ingress` в `agents-manager`, worktree
  `/tmp/agents-manager-p2-fix` (база `4c9fab8`) — ingress-dedup ДО транскрипции (pre-transcription latch на
  `update_id`, awaited, до `ackSeen`/`handleVoice`). Изменения **UNCOMMITTED** в рабочем дереве (5 файлов
  правлено: `telegram-channel.ts`, `orchestrator.ts`, `build-app.ts`, `inbound-message.interface.ts`,
  `data-source.ts` + 4 новых: `dedup-key.util.ts`, `ingress-dedup.interface.ts`,
  `telegram-channel.voice-dedup.spec.ts`, `message-dedup-index.spec.ts`).
- **Land = действие владельца** (не FF-агента — FF read-only на `agents-manager`): смёрджить ветку +
  `pm2 restart` + подтверждающий репро-прогон (§4 how-to-implement.design.md). До land — P-2 остаётся OPEN.
- **Канонический пульт FF, отражающий этот же статус:** `docs/00-states/05-assemble-and-direct/state.md`
  (текущая кнопка баттона, строки "P-2 voice-dup — фикс на ветке `fix/p2-voice-dedup-ingress`… ждёт
  land+restart владельцем").
