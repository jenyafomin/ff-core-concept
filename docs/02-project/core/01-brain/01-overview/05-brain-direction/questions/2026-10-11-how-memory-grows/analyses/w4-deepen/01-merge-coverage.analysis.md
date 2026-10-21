# W4-01 Слияние 8 ветвей в один граф + покрытие

- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** W5 (функция «куда сейчас»), W6 (OVERVIEW) · **Поглощает:** `maps/branches/B1..B8.graph.jsonl` как сырьё (остаются нетронутыми)
- **Вопрос-цель:** складываются ли 8 ветвей в ОДИН связный граф, покрывающий все мысли владельца, без дублей и сирот?
- Артефакты: `maps/MINDMAP.graph.jsonl` (истина) · `maps/render.mjs` · `maps/MINDMAP.mermaid.md` (вид).

## 1. Результат сборки
90 узлов (лимит critic ≤90 — упёрлись), 260 рёбер, 0 сирот, 0 недостижимых от корня. Корень `root` (zero_premise «жизнь = 0»), кольцо `ring` (п.12,15,19,22,24; F1), 8 ветвей part-of → root. 4 слито, 4 заглушки-пробела, 8 узлов «против» (по одному на ветвь). Реальность листьев: 🟢24 · 🟡32 · 🔴20 · ⚔️8; ★ «сейчас» = 6 узлов контура B1→B3→B2 (кандидат Fable, **не принят**, проверяет W5).

## 2. Сироты в сырье (были, починены)
Из 242 исходных связей 52 (21%) указывали в пустоту, ещё 91 ссылка в `payload.unlocks`. Причина — ветви писались параллельно без общего словаря id:
- ветви B3 и B8 названы `B3`/`B8`, остальные `Bn/branch` → писали обе формы (`B3/branch`, `B8/branch` не существуют);
- `trunk/B2…`, `trunk/root` (B4, B5), голые `B1`, `B5`; `Bn/*` в B6; выдуманные `B2/constructor`, `B7/lens-time`;
- единственное **содержательное** битое: `B5/erase-gate` (B6 дважды) — такого узла нет, смысл = `B5/erase-in-brain`.
Починка — нормализация словаря (id узлов НЕ менялись, стабильность для будущих record). Только последнее — смысловое исправление.

## 3. Дубли (слиты; старый status=superseded, остаётся в файле)
| Победитель (владелец) | Superseded | Почему один |
|---|---|---|
| `B6/msg-address` | `B1/source-pointers` | оба «адрес источника вместо копии» (п.2/10) |
| `B2/first-read` | `B7/goal-lens` | одно чтение «открытые вопросы цели» вместо START; pays_off одинаков (2026-10-18) |
| `B2/why-walk` | `B3/why-read` | идентичный `read(decision, derived-from/motivated-by, depth≤2)`; даже пара motivated-by друг на друга |
| `B2/smart-filters` | `B7/facets` | те же недостающие оси `find` (теги/окно/температура); B7/facets сам писал «about smart-filters» |
Победитель получает объединённые `owner_points`, `merged_from`, ребро `supersedes`; входящие ссылки на старый перенаправлены.

**Рассмотрено и НЕ слито (разный механизм, связаны ребром):** `B1/project-prefix` ↔ `B4/cross-project-tasks` (префикс-метка vs M:N scope+source) · `B5/erase-in-brain` ↔ `B6/erase-gate` (способность vs ступени допуска хука) · `B8/wave-cycle-pattern` ↔ `B8/first-system-loop` (паттерн vs первый экземпляр) · `B7/presets-as-lenses` ↔ `B7/lens-as-record` · `B4/tags-categories` (решение о представлении тега).

## 4. Противоречие, не дубль (требует решения F3)
`B3/question-node` («вопрос = note + fields, **без нового типа**») против `B2/question-type` («завести **u:question**»). Оба тянут один pays_off — `find(open)` вернёт ≥1 вопрос к 2026-10-18. Оставлены оба, связаны `about` + пометка «ТЕНЬ F3». Дефолт F3 Fable: тип после 3-го повтора (уже выполнен) → вероятный победитель B2/question-type через `B8/type-trail`; решает W5/владелец.

## 5. Покрытие (по реальным узлам, без root)
**п.1–24:** все покрыты ≥3 узлами. Тонкие места (≤3 листа): п.1 (B8, packs, universality) · п.4 (smart-filters, tags-categories — оба 🔴) · п.7 (только процедурно: first-read, proto-layer, waits-for-you) · п.13 (лишь B7/branch, B8, system-node — «луп с глобальной целью над многими проектами» листа не имеет; goal-lens слит в first-read) · п.14 (lens-as-record, concept-render, presets).
**«Легко потерять»:** 8→B4/people-layer, one-way-door, B5/consent-use · 9→B5/retention-data, copies-map · 10→B1/project-prefix, B4/cross-project-tasks · 11→B2/smart-filters, B7/presets-as-lenses · 13→см. выше (тонко) · 14→B7/lens-as-record · 16→B3/genealogy, B2/question-type · 18→B8/system-node, B5/authority-f2.
**Решения 10-10:** п.1→B2/proto-layer, B6/hook-site · п.3→B2/push-lens · п.4→B5/trust-policy, retention-data · п.5→B1 (4 узла) · п.6→B7/type-views · п.7→B1/week1-fence · п.8 (R1 вживую)→B8/prompt-layers-bridge (shadow-окно) · п.9→B5/trust-policy · п.10 (бэкап)→B5/copies-map (частично: решение «куда», а не карта копий) · **п.2 → пробел**, **п.11 → пробел**.
**Заглушки gap=true (добавлены):** `B8/gap-system-types` (п.2: sys-типы read-only для агента; `B1/system-feed` лишь импортирует промпты, тег «10-10 п.2» там натяжка) · `B4/gap-company-project-scope` (п.11: родитель области `personal` не меняется — какая дверь это держит).
**F1–F5:** F1→ring (владелец ответил п.24/15) · F2→B3, B3/fork-triage, B5, floor-k4, authority-f2, trust-policy · F3→B2/question-type, B3, B3/question-node, B8/type-trail, predicate-trail, packs · F4→B3, opinions-passport, prediction-check, principal-collapse · F5→B2, first-read, waits-for-you, B8/packs. Узлов-вопросов Q-F1..F5 в графе нет — покрытие только через `payload.forks` (слабое; отдельный пункт для W6).

## 6. Честные ограничения
- 90/90 — лимит выбран; новые узлы W5/W6 требуют слияния или снятия лимита.
- `file:` ссылки (72) проверены на существование эвристически (набор баз), не по строкам `file:line`.
- Сироты решены **синтаксически**; семантическую связность (что рёбра `motivated-by` между ветвями смысловые, а не декоративные) я не проверял — 260 рёбер включают 8 ветвей×part-of.
- Метка ★ — мой перенос выбора Fable в данные, а не результат функции.

Итог: решение — единый граф принят как рабочий (0 сирот, 4 дубля слиты, 2 пробела закрыты заглушками); открыто на W5: F3-противоречие question-node/question-type, тонкое покрытие п.13/п.4, проверка ★-контура.
Вопрос-цель: ответил (да, складываются) — с оговоркой: «связный» достигнут формально; содержательная связность п.13 и F-развилок как узлов не доказана.
