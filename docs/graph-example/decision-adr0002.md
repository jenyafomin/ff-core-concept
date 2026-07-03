---
id: decision-adr0002
type: decision
schema: decision@1
created: 2026-06-21
updated: 2026-06-21
epistemic: fact
sensitivity: internal
source: human
principal: owner
level: what
links:
  - { rel: child-of, to: project-ff, home: true, priority: 5 }
  - { rel: realizes, to: goal-001, home: false }
  - { rel: supersedes, to: decision-adr0001, home: false }
---

# Паспорт ратифицирован (ADR-0002)

Узел = тонкий паспорт; принадлежность/важность/каскад — на ребре; ровно один `home`; control-plane = узлы.

## Поведение (комментарии)
- `realizes`→`goal-001` — обычное ребро (НЕ home): решение служит цели, но «живёт» в проекте.
- `supersedes`→`decision-adr0001` — настоящая замена (старое решение помечается устаревшим).
- Линза «решения по проекту» соберёт эту ячейку через `child-of`-спину, не открывая тело.
