---
node_type: question
title: "OQ-1 · Ветка-гипотеза = форк ленты или вариант проекции?"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md
tags: [durable-store, acts-as-git, kernel, blocker, level-FQ25]
---

# OQ-1 · Ветка-гипотеза = форк ЛЕНТЫ или вариант ПРОЕКЦИИ?

**Суть развилки:** блокирует расширение StorePort под acts-as-git (Ц3, «безопасный эксперимент»).
- **(A) форк журнала** — расходящаяся история; merge/выброс = «настоящий git»; тянет к concurrency/CRDT (дорого).
- **(B) вариант проекции** — та же лента, другой reducer; «ветка» = линза; дёшево, одна истина.

**Что блокирует:** нельзя расширять StorePort под ветвление, пока не решено (риск рецидива паттерна P-06 —
молчаливое пред-решение кодом).

**Статус:** владелец 08-04 сказал «пока не обдумывать». Решать РЕШЕНИЕМ, не кодом.

**Связь:** tension-with `q-branch-label-vs-hypothesis-node.question.md` — смежный, но отдельный вопрос
(семантика ленты vs форма данных ветки).
