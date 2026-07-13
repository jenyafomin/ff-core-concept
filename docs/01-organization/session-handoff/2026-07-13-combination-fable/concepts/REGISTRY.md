# REGISTRY — граф концептов сессии (перелинковка id ↔ id)

- **Type:** concept · **id:** REGISTRY · Date: 2026-07-13
- Механизм перелинковки (ответ на запрос владельца «концепт в концепте»). Это **ручной прототип графа
  Brain**: узлы = файлы с `id`, рёбра = типизированные ссылки. Ровно модель субстрата (md+frontmatter,
  связи по id), только пока руками.

## Как работает перелинковка (3 правила)
1. **У каждого артефакта есть `id`** (в frontmatter). Короткий, стабильный. Здесь — реестр id → путь.
2. **Связи — в поле `links:`** типизированными рёбрами (словарь как в диалог-графе проекта):
   `grounds` (обосновывает) · `refines` (уточняет) · `answers` (отвечает) · `raises` (порождает) ·
   `tension-with` (в напряжении) · `synthesizes` (сводит) · `supersedes` (заменяет).
   Формат строки: `edge → target-id`.
3. **Многоуровневость** = идёшь по рёбрам транзитивно: концепт ссылается на концепт, тот — на следующий.
   Реестр resolve-ит `id → путь`; обход графа = следовать `links`.

## Узлы и рёбра (граф этой сессии)

| id | Type | Путь (от корня сессии) | Связи (edge → id) |
|----|------|------------------------|-------------------|
| **START** | concept | `_START-HERE.md` | grounds → REGISTRY; grounds → HANDOFF |
| **MANDATE** | report | `MANDATE.md` | grounds → CTX; grounds → FBRIEF |
| **CTX** | concept | `CONTEXT-DIGEST.md` | synthesizes → (explorer-maps); grounds → FBRIEF |
| **FBRIEF** | report | `FABLE-BRIEF.md` | raises → FABLE; grounds → FABLE |
| **FABLE** | concept | `FABLE-VERDICT.md` | answers → FBRIEF; tension-with → CRITIC; grounds → SURV |
| **CRITIC** | raw | `concepts/CONCEPT-critic.md` | tension-with → FABLE; refines → SURV |
| **VALUES** | raw | `VALUES-diverge-BA.md` | grounds → SCAFFOLD-VALUES |
| **SURV** | concept | `SURVIVING-CUT.md` | synthesizes → FABLE, CRITIC; grounds → SCAFFOLD |
| **PROTO** | decision | `PROTOCOL-concept-first.md` | raises → REGISTRY; grounds → SCAFFOLD-CLAUDE; refines → M4 |
| **REGISTRY** | concept | `concepts/REGISTRY.md` | answers → PROTO |
| **HANDOFF** | concept | `HANDOFF-OWNER.md` | synthesizes → SURV, PROTO |
| **MOVE** | report | `MOVE-PLAN.md` | grounds → (перенос проекта) |
| **SCAFFOLD** | concept | `combination-scaffold/docs/INDEX.md` | grounds → VISION, VALUES-idx, INFRA, ADR* |
| **VISION** | concept | `combination-scaffold/docs/product/VISION.md` | refines → SURV |
| **VALUES-idx** | concept | `combination-scaffold/docs/values/README.md` | grounds → CV1..CV6 |
| **INFRA** | concept | `combination-scaffold/docs/infrastructure/INDEX.md` | grounds → ADR-C0..C6 |
| **ADR-C0..C6** | decision | `combination-scaffold/docs/decisions/ADR/ADR-C*.md` | answers → CQ* (open-questions) |
| **OQ** | question | `combination-scaffold/docs/open-questions/INDEX.md` | raises → ADR-C0,C2,C1 |

## Мысль на будущее (что ещё придумать — открыто)
- **Обратные рёбра** (backlinks) считать автоматически (сейчас руками).
- **Резолвер id→путь как код** (потом = модуль M1 Registry в «Combination»: реестр-как-узлы).
- Когда узлов станет >~20 — ввести под-графы/неймспейсы (правило группировки value-decomposition).
- Это и есть ранняя версия **M1 (реестр) + M4 (провенанс)**: сегодня руками в REGISTRY, завтра — движком графа.
