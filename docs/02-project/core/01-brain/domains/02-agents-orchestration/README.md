---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: domain-index
domain: agents-orchestration
Related:
  - node-types.md
  - edge-types.md
  - policy.md
  - modules.md
  - ../README.md
  - ../01-knowledge-graph-domain.md
  - ../../architecture/MODULES.md
  - ../../architecture/NEXT-SESSION-brief.md
  - ../../synthesis/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../synthesis/2026-07-12-fable-db-module/C-orchestration-tenancy.md
  - ../02-agents-orchestration-domain.md
---

# Домен 02 — 🤖 АГЕНТЫ / ОРКЕСТРАЦИЯ (индекс)

> Раскрытие в папку 2026-07-12. Предыдущий файл [`../02-agents-orchestration-domain.md`](../02-agents-orchestration-domain.md)
> был **stub — свёрнут сюда** (пометка Status: superseded внутри него, ссылка обратно на эту папку).

## Что за домен
Подграф оркестрации агентов на ТОМ ЖЕ графе-субстрате, что и домен 01 (граф знаний) — не отдельная БД.
Держит: кто есть агент (Personality), кто сейчас исполняет (AgentSlot/Session), к какому каналу/чату он
привязан (conversationRef), что он делал и сколько стоило (Observation/WorkLog), и ссылки на петли
(Pattern/Task, детально в M-P3, здесь — только как узел-сосед).

## Метод (тот же, что у домена 01)
Control-plane (тонкие паспорта + `DataResidency`) над data-plane (проектные БД/payload). Поведение —
данными, движок — исполнитель (I-2): типы узлов/рёбер и policy — реестр-строки, не хардкод.

## Под-файлы
- [node-types.md](node-types.md) — Personality, AgentSlot, Session, conversationRef/ChannelBinding,
  Observation/WorkLog, ссылка на Pattern/Task.
- [edge-types.md](edge-types.md) — `bound-to · replica-of · reports-to · verified-by · channel-bound`,
  2 класса (thin-ref / assertion-edge).
- [policy.md](policy.md) — глобальные vs проектные настройки через `scope` + override-каскад.
- [modules.md](modules.md) — модули M-P2 (Telegram-адаптер) и M-P4 (Кокпит/наблюдаемость), развёрнутые
  по шаблону `назначение · node/edge · память · кросс-связи · global/project · сейчас/позже`.

## Граница с доменом 01 (открытый вопрос, не решён)
Где живёт **память агента** — Session-payload здесь (домен 02) или это уже узлы домена 01, на которые
Session только ссылается (`bound-to`/thin-ref)? Рабочая гипотеза этой сессии: Session сама — узел домена 02
(координата исполнения), но её **содержимое памяти** (о чём агент вспоминает/пишет) — узлы домена 01;
Session держит thin-ref на них, не дублирует payload. Не ратифицировано — см. `policy.md` и
`../../architecture/NEXT-SESSION-brief.md` (острая развилка №2 аналогично для домена 03).

## Опора / первоисточники
`../../synthesis/2026-07-12-fable-db-module/C-orchestration-tenancy.md` (линза C — механики C1–C5,
прямой источник узлов/рёбер здесь) · проектный `CLAUDE.md` (раздел «Telegram-шлюз» — живой пример
`conversationRef`+PROMPT.md-каскада, до всякой схемы) · ВНЕ проекта:
`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/00-organization/session-handoff/2026-07-12-loop-engineering-repo-analysis/03-db-design-tasks.md`.
