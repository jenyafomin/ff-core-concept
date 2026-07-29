---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
node_type: overview
title: Совет 6 агентов по открытым вопросам ядра — индекс (2026-07-25)
---

# 🧭 Совет 2026-07-25 — открытые вопросы ядра (KQ) · индекс

> ВИД, не второй дом истины. Здесь — что был за совет и куда легли синтезы.

## Что это
Совет 6 агентов пере-разобрал реестр `../../open-questions.md` (KQ-1..14). Прогнан на двух самых
фундаментальных двусторонних вопросах — **KQ-11** (память: проекция vs узел) и **KQ-8** (семантика
удаления). Остальные 12 — триажированы в корзины A/B/C.

## Дети (дёшево-читаемые куски)
1. **`1-triage-14kq.analysis.md`** — полный триаж всех 14 KQ (🟢 A ратифицируемо · 🟡 B сильная рек · 🟣 C совет).
2. **`2-consolidation-plan.analysis.md`** — META-FINDING: `00-kernel/` переоткрыл решения `01-brain/`
   без ссылок; план реконсиляции дублей (LOSE-NOTHING) + стратегия KQ-14 = вглубь.
3. **`3-kq4-trace-redaction-critic.analysis.md`** — критик-прогон KQ-4 (редакция trace-ноги): вердикт
   **AMEND** — утечка на записи, не на чтении; хукать trace ПОСЛЕ стадии `filter`; KQ-8 = предусловие.
4. **`4-kq1-assertion-critic.analysis.md`** — критик-прогон KQ-1 (assertion примитив или проекция?):
   вердикт **AMEND** — расщепить 1a (простые поля=проекция) / 1b (инсайты=паспортное ребро) + третья
   дыра field-scoped запросов; не паковать KQ-1/2/11 в один ADR.

## Синтезы совета (дома истины по темам)
- **KQ-11** → `../../../01-brain/01-overview/analyses/kq11-memory-projection-vs-node--council-2026-07-25.analysis.md`
- **KQ-8** → `../../../01-brain/01-overview/01-values/07-soglasie/decisions/kq8-deletion--council-2026-07-25.analysis.md`

## Связи
- `../../open-questions.md` (реестр KQ) · `../../invariants.md` (I-1..I-14, требуемые carve-outs/I-15)
- Навигатор ветки: `./concept.json`
