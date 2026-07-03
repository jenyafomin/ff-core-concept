---
id: insight-multidim
type: insight
schema: insight@1
created: 2026-06-23
updated: 2026-06-23
epistemic: hypothesis
sensitivity: internal
source: agent
principal: owner
level: what
links:
  - { rel: child-of, to: project-ff, home: true, priority: 4 }
  - { rel: about, to: file-node-ts, home: false }
  - { rel: grounds, to: decision-adr0002, home: false }
---

# Многомерность доказана на реальном файле

`node.ts` живёт в одном `home` и многих `facet-of` одновременно — то, чего файловая система структурно не умеет.

## Поведение (комментарии)
- `source: agent` + `epistemic: hypothesis` — вывод сделан агентом; пока гипотеза, не факт. Поднять до `fact`
  может только верификатор/человек (не сам агент-автор) — «клапан доверия».
- `about`→`file-node-ts`, `grounds`→`decision-adr0002` — ссылки (не `home`); ячейка живёт в проекте, но касается других.
