# A · DeepSeek Harness / Cordis — как всё связано внутри

- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-08-23 · **Scope:** project
- **Родитель:** `../INDEX.md`
- **Внешние источники:** `github.com/deepseek-ai/deepseek-harness` (MIT) · мета-фреймворк Cordis

## Scope этого направления
Понять паттерн **«everything is a plugin»** на Cordis: как устроена композиция (в пространстве — какие плагины
активны; во времени — mount/unmount), плагин-контракт, границы модулей, 4 режима (Standard/Code/Minimal/Creator),
что реально кастомизируемо/переиспользуемо (вкл. UI), и границы (dev-preview, breaking changes).

## Наполнение (растёт; file-first)
- `analyses/` — `*.analysis.md` (архитектура, плагин-модель, режимы, кастомизация/reuse, границы)
- `facts/` — проверяемые факты с ссылками (repo file:line / URL)
- `questions/` — открытые вопросы и связки к нашим D1/D2 и 7 ценностям
- `ideas/` — `*.idea.md` — что из этого можно взять к нам

> Заполняется командой скаутов Wave 1. Дом-истина здесь; trace — в `docs/_log/`.
