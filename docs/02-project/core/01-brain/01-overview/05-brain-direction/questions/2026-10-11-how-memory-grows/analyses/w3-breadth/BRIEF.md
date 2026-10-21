# БРИФ W3 — перепись ширины одной ветви
Читать: `../w2-trunk/00-TRUNK-DECISION.md` (обязательно), `../w2-trunk/02-fable-trunk.analysis.md` §2–§5 (ветви и форма узла),
`../w1-altitude/02-analyst-base-inventory.analysis.md` (что есть в коде), `../../../../START-NEXT-SESSION.md` §2 (24 мысли + «Что легко потерять»).
Код: `/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/{brain,brain-mcp,engine}/src` — только читать, ссылки file:line.

Твоя ветвь — указана в задаче. Сделай ПЕРЕПИСЬ ШИРИНЫ (вширь, не вглубь):
1. Все под-узлы ветви уровня 2 (≤10), каждый: label ≤60 · summary 1 строка · реальность {code, paper, life} 0..1 с file:line · какие п.1–24/F1–F5/V1–V7 · `pays_off` (проверяемое событие + дата) · `cost` мало/средне/много · `unlocks` (id узлов других ветвей) · статус proposed.
2. ≥1 узел-«против»: самый сильный аргумент, что эта ветвь сейчас НЕ нужна / рамка ветви неверна.
3. Пустые грани: где под узлом нет ни кода, ни реальных данных — пометить 🔴.
4. Связи наружу: какие узлы ДРУГИХ ветвей (B1..B8) нужны этой и какие она открывает.
5. Оценка ветви по функции «куда сейчас» (числами, с объяснением).

ВЫХОД (два файла, только свои):
- `../../maps/branches/<Bn>.graph.jsonl` — по строке на узел (ветвь-узел + под-узлы), форма из Fable §5, JSON в одну строку: {"id","type","label","summary","status","temperature","author","confidence","payload":{...},"links":[{"predicate","to","confidence","note"}]}. Предикаты ТОЛЬКО: part-of · about · derived-from · motivated-by · supersedes. id: `q:how-memory-grows/<Bn>/<slug>`.
- `<Bn>-<slug>.analysis.md` в этой папке (шапка Status draft · Owner jenya.stasik@gmail.com · Date 2026-10-11 · Потребитель: W4/W5 · Поглощает: ничего; ≤900 слов; в конце «Итог:» и «Вопрос-цель: ответил/не ответил/вопрос был неверен…»).
Проверь jsonl: `node -e` построчно JSON.parse. Не пиши код в packages, не коммить.
ВЕРНИ ≤150 слов: узлы одной строкой, «против», оценка ветви, главная связь.
