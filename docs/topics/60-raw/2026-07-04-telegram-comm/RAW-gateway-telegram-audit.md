---
Status: raw
Owner: jenya.stasik@gmail.com
Date: 2026-07-04
Source: суб-агент analyst (sonnet), аудит кода dwizh gateway apps/gateway/
Related: ../../10-synthesis/2026-07-04-CONCEPT-telegram-communication.md
---

# RAW — аудит Telegram-слоя dwizh gateway (по коду)

**1. Отправка сообщений.** `TelegramChannel.send()` (`channel-telegram/telegram-channel.ts:78-95`) делает один вызов `bot.api.sendMessage(chatId, text, other)` — нарезки на части по лимиту 4096 в коде НЕТ (grep по `4096|splitMessage|chunk` пуст). `parse_mode` нигде не задаётся — plain text по умолчанию. Отправки файлов/документов нет (`sendDocument`/`sendPhoto` не встречаются). Есть редактирование отправленного сообщения через `TelegramMessageHandle.edit/finalize` (`channel-telegram/egress/telegram-message-handle.ts:16-22`, `api.editMessageText`) — задел под потоковый вывод (M5).

**2. Топики/threads.** `normalize-inbound.util.ts:24` берёт `msg.message_thread_id` при `is_topic_message === true`. `buildConversationId(chatId, threadId)` (`channel-telegram/conversation-id.util.ts:10-12`) даёт `chat` либо `chat:thread`; обратный разбор `parseConversationId`. Router (`server/routing/router.ts:22-54`) кладёт conversationId прямо в `sessionKey` — отдельного маппинг-стора нет. Entity `topics` (`server/persistence/entities/topic.entity.ts`): `id, botId, title, parentTopicId, threadId, lastSummaryId, links, status` — ось группировки диалогов/саммари; `Session.topicId` опционален. Автосвязывания «Telegram-топик → строка topics» нет.

**3. Reply-обработка.** Входящий `reply_to_message` НЕ читается (`normalize-inbound.util.ts`) — маршрутизация от reply пользователя не зависит. Обратное есть: gateway проставляет `reply_parameters` в исходящем (`telegram-channel.ts:84-92`) из `job.origin.replyToMessageId` — бот отвечает reply'ем на сообщение юзера.

**4. Кнопки.** `InlineKeyboard` не встречается — кнопки нигде не строятся. `/approve` и `/reject` — текстовые команды (`telegram-channel.ts:99-114`). Обработчик `callback_query:data` зарегистрирован (`telegram-channel.ts:115-121`), `parseCallbackData` разбирает `gw:approve:<jobId>` / `gw:reject:<jobId>` (`control/parse-control.util.ts:18-39`) — но клавиатура с такими данными нигде не отправляется: `ApprovalGate.request` (`server/approval/approval-gate.ts:39-51`) шлёт только текст. Callback-путь = готовая заготовка.

**5. Хедеры.** Есть: `buildReplyHeader`/`applyReplyHeader` (`server/orchestration/reply-header.util.ts:21-47`) формируют `🤖 <agentName|botId> · <model> · 💰 $X (Σ $Y)` перед ответом. Вызов в `TurnExecutor.decorateReply` → `persistOutcome` (`turn-executor.ts:240-270`), только для успешных ходов; включение env `GATEWAY_REPLY_HEADER`. В БД сохраняется сырой reply без хедера.

**6. Сохранение.** Таблица `messages` (`server/persistence/entities/message.entity.ts`, `IMessageRow`): `id, sessionKey, botId, direction, userId, username, text, ts, refs, costUsd`. Telegram `message_id` **НЕ сохраняется**; `IInboundMessage.messageId` используется только транзитно для `replyToMessageId`. Инбаунд пишет `Orchestrator.buildInbound` (`orchestrator.ts:127-141`), аутбаунд — `TurnExecutor.persistOutcome/sendNotice`.
