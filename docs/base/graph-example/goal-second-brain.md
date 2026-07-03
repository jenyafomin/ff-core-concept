---
id: goal-001
type: goal
schema: goal@1
created: 2026-06-12
updated: 2026-06-23
epistemic: fact
sensitivity: internal
source: human
principal: owner
level: why
links:
  - { rel: child-of, to: project-ff, home: true, priority: 5 }
---

# Второй мозг, который ещё и действует

Единый граф знаний + слой агентов, которые читают его, делают работу и пишут обратно. Главная цель — модульность.

## Поведение (комментарии)
- `home`→`project-ff` — единственный «дом». По нему вниз каскадятся scope/sensitivity/дефолт-линза.
- `level: why` — линза «зачем» покажет эту ячейку на верхнем уровне обзора, не вскрывая тело.
- `epistemic: fact` — это утверждённая цель; повысить до факта мог только человек (не сам автор-агент).
