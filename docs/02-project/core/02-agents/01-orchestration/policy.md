---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: policy-registry
domain: agents-orchestration
Related:
  - README.md
  - node-types.md
  - ../../01-brain/values/05-suverennost/02-policy-as-data
  - ../../01-brain/architecture/NEXT-SESSION-brief.md
---

# Policy домена 02 — global vs project, каскад override

## Две независимые оси (не путать)
1. **`scope`** — кому политика адресована: `global` (весь флот, все проекты) vs `project` (один проект/чат).
2. **Уровень каскада** — где в иерархии override встаёт: у нас уже есть работающий прецедент вне схемы —
   `~/.claude/CLAUDE.md` (global) → проектный `CLAUDE.md`/`.claude/rules/` (project) → `.gateway/conversations/<chatId>/PROMPT.md`
   (chat) → `.../<threadId>/PROMPT.md` (topic). Это и есть каскад **на практике**, до всякой БД-схемы.
   Policy-as-data домена 02 обязана это ВОСПРОИЗВЕСТИ как данные, не как файлы на диске.

## Модель: policy-узлы + один каскад
Хребет проекта (принят): **Конституция > policy-as-data > integrity-as-engine-duty**. Для домена 02:
policy — это узлы реестра (`AgentPolicy`), НЕ один гигантский конфиг-узел. Поля: `scope (global|project)`,
`subject (personalityId | slotId | tenantId)`, `payload` (что регулирует: модель, rate-limit, доступные
инструменты, cost-cap). Разрешение — **read-time вид `effective`**: собирает применимые policy-узлы по
каскаду `global → project → chat → topic` и схлопывает в одну эффективную запись для конкретного
`AgentSlot`/`conversationRef`. Тот же паттерн, что `effective binding` в `edge-types.md` (`bound-to`).

## Что регулирует policy домена 02 (примеры)
- Какая Personality доступна в каком проекте (allow-list).
- Дефолтный `mode` слота (bound/background/task) и лимиты на реплики (`replicaOf`-глубина/количество).
- Cost-cap / rate-limit на `tenantId` — читается M-P4/M-P3 (гейты петель) из того же каскада.
- Канальные политики (M-P2): кто одобряет Telegram-пейринги (per проектный `CLAUDE.md`: агент НЕ
  одобряет пейринги сам — это уже policy-правило верхнего уровня, констатирующее override вниз запрещён).

## Острая развилка (не ратифицирована, из `NEXT-SESSION-brief.md`)
«Один policy-узел или много?» — рабочий кандидат-ответ этого домена: **много policy-узлов в реестре +
один каскад разрешения**, не гигант. Причина: гигант ломает I-2 (поведение данными — каждая policy
должна быть адресуемым, версионируемым узлом со своим provenance), и не даёт частичный override
(проект переопределяет ОДНО поле, не весь конфиг). Ратификация — решение владельца/Fable, не этой сессии.

## Кросс-связь с доменом 01
Policy-узлы физически — те же узлы субстрата (реестр `node-type: AgentPolicy`), связь на subject —
thin-ref (`applies-to`, не входит в 5 рёбер этого домена — сосед из реестра M-G3/domain 01 policy). Не
дублируем 7-ценностный каскад домена 01 — там policy про ДАННЫЕ, здесь — про ПОВЕДЕНИЕ АГЕНТОВ; общий
только механизм (каскад + effective-вид), не содержимое.
