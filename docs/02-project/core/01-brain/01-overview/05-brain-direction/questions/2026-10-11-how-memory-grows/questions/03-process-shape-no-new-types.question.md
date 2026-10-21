---
id: Q-F3
type: question
kind: fork
status: open
load_bearing: false
decider: agents
decided_by: null
author: co-orchestrator
derived_from: [analyses/w1-altitude/02-analyst-base-inventory.analysis.md, analyses/w1-altitude/04-architect-growth-as-data.analysis.md, analyses/w1-altitude/03-critic-direction.analysis.md]
edges: [{pred: part-of, to: Q-1}]
light: green
---
# Q-F3: Хватит ли ядро-типов и ≤7-строчного чек-листа, или заводить `u:question/u:idea/u:vote`?

Позиции: architect — `u:`-тропы через `raw`, голос записью (нужны роль/модель/семья); critic — новые типы запрещены START §6 и ADR-0017 до 3-го ручного повтора, протокол = чек-лист ≤7 строк; analyst — `type-def` кандидат и предикаты `answers/refines` в статусе candidate, но architect: неизвестный предикат запись отклоняет. Расхождение предикатов свести в волне 2 (Карта 1).
Дефолт: ни одного нового типа и предиката в мозге; в md — frontmatter с теми же полями, что у `record`; голос = строка в файле. Тип рождается после 3-го ручного повтора.
Решают: агенты + critic; владелец в курсе.
Условие пересмотра: 3 повтора одной формы голоса.
Предсказание: пересадка без новых типов не теряет ни одного поля.
