---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
node_type: overview
title: КАРТА ПОНИМАНИЯ docs/ — единственная точка входа (дерево + статусы + как читать)
supersedes: ./NAVIGATION.md (2026-07-06, устарела)
Related:
  - ../.claude/rules/doc-tree.md        # всегда-в-контексте законы размещения
  - ./.doc-types.json                    # реестр типов → домов (машиночитаемый)
  - ./00-states/STATE.md  # где мы сейчас (живой навигатор)
---

# 🗺️ КАРТА ПОНИМАНИЯ docs/ — точка входа

> Читай ЭТОТ файл первым. Он отвечает на два вопроса: **(1) как лежат документы** (дерево + статусы) и
> **(2) как с ними взаимодействовать** (порядок чтения, что канон / стейджинг / архив / след).
> Держится мелким (area-level) и правдивым НАРОЧНО — детали живут в `INDEX.md` каждой области.
> Законы, по которым это дерево живёт: `.claude/rules/doc-tree.md` (всегда в контексте).

## 📖 Как читать (порядок входа)
1. **`00-states/STATE.md`** — где мы сейчас (живой навигатор, обновляется в конце сессии).
2. **свежая папка `_log/<дата>-<тема>/HANDOFF.md`** — что делали в последней сессии (след, только указатели).
3. **`00-states/`** — какие темы-состояния открыты (в какое входят агенты).
4. **`INDEX.md` нужной области** ниже → внутри неё `*.concept.json` (навигатор-визард ветки).

## 🏷️ Легенда статусов
🟢 LIVE/канон · 🟡 стейджинг/портфель · 📦 архив (read-only) · 🔴 УСТАРЕЛО→действие · 🔜 план/резерв

---

## Дерево docs/ (area-level, со статусами)

```
docs/
├── INDEX.md            🟢 этот файл — точка входа
├── NAVIGATION.md       🔴 superseded (07-06) → редирект на этот INDEX
├── .doc-types.json     🟢 реестр типов→домов (машиночитаемый; homeRule единиц ждут правки под 02-units)
│
├── _log/               🟢 СЛЕД (trace, gitignored). Сессии-папки <дата-тема>/{HANDOFF.md, concept.json, шаги}
│                          НЕ дом истины — только указатели. Последняя: 2026-07-21-brain-restructure-recovery-and-model
├── 00-states/          🟢 СОСТОЯНИЯ (R2, единственный дом). NN-<slug>/{state.md, log.md}
│                          00-global-build · 01-tree-rules-and-librarian · 02-agent-system-mechanics · 03-brain-productization
│
├── 01-organization/    🟢 КАК РАБОТАЕМ (канон)
│   ├── session-handoff/     🔴 растворён → INDEX.md = бридж-леджер (сессии переехали в _log/)
│   ├── doc-discipline/      дисциплина дерева: реестр типов, methods 01-03, restructure-2026-07/ (см. реестр ниже)
│   ├── process/             протокол диалога, регламент делегирования, баги шлюза
│   ├── data-canon/          каноны модели данных/БД (инварианты хранения)
│   ├── rules-and-skills/    место под .claude/rules + скиллы (проектируется)
│   └── registry.seed.json   сид словаря типов (→ расширен в .doc-types.json)
│
├── 02-project/         🟢 ЧТО СТРОИМ (канон)
│   ├── core/                🟢 ядро продукта
│   │   ├── 01-brain/            🟢 БАЗА — единица памяти / субстрат-граф (активно проектируется)
│   │   │                          вход: 01-brain/INDEX.md → brain.concept.json
│   │   │                          01-overview/{01-values, 02-domains} · 02-infrastructure/{modules M-G*, stack}
│   │   │                          _archived/decomposition-pre-dissolve-2026-07-20/ (восстановленный оригинал единиц)
│   │   ├── 02-agents/           🟡 слой агентов над памятью (частью в external TOOLS/agents-manager)
│   │   │                          01-orchestration/{state, plan, task, loop}
│   │   └── 03-contract/         🟡 стык brain↔агенты («базовые механики взаимодействия») — стаб, нужен контент
│   └── substrate/          🔴 почти пустой дубль brain-as-substrate → свернуть в 01-brain
│
├── 03-projects/        🟡 портфель владельца (5 проектов-потребителей: 7days, cardex, dwizh, ga-rentacar, video-social-music)
├── 04-knowladge/       🔴 резерв + ОПЕЧАТКА в имени → 04-knowledge когда появится контент, иначе убрать
│
├── _inbox/             🔴 объявлен растворённым (07-19), остался только README → убрать/в _log
├── topics/             📦 СТАРЫЙ архив (переход 07-06). Имя перегружено: как ТИП `topics/`=стейджинг (см. реестр),
│                          но корневой docs/topics/ — архив. Развести именем; read-only до разбора
└── base/               📦 архив до 07-06 (read-only, только история)
```

---

## 🧩 Типы документов → дома (кратко; полный реестр — `.doc-types.json`)

| Тип | Суффикс/имя | Где живёт (homeRule) |
|---|---|---|
| **overview** | `README.md`/`INDEX.md` | корень любой папки — ВИД, не хранилище |
| **conversation-log / handoff** | `.md` в `_log/<дата>/` | СЛЕД, gitignored, только указатели |
| **state** | `state.md` в `00-states/NN-*/` | единственный дом состояний (R2) |
| **design / ADR-draft** | `.design.md` / `ADR-DRAFT-*.md` | рядом с темой → `decisions/` → `docs/architecture/ADR/` при ратификации |
| **idea / ideas** | `.idea.md` / `ideas/` | контейнер идей у ценности/направления |
| **контейнеры** | `analyses/ questions/ decisions/ plans/ maps/` | ВНУТРИ своей темы, плюрал, без номера |
| **concept.json** | `.concept.json` | навигатор-визард (detectConcept: type/id + steps/paths) — НЕ trace |

---

## 🔧 Реестр реструктуризаций (чтобы было очевидно «сколько их и где»)

| Реструктуризация | Дом | Карты (from→to) | Последнее |
|---|---|---|---|
| **restructure-2026-07** | `01-organization/doc-discipline/restructure-2026-07/` | MAP-current · MAP-target · DECOMPOSITION-DISSOLVE-MAP · AUDIT-MAP-2026-07-21 · **PLACEMENT-AUDIT-2026-07-21** (последняя) | карта размещения brain готова; 9 форков владельцу |

> ⚠️ Сами карты сейчас лежат плоско в `restructure-2026-07/` и `.../brain-top-level/` (25 файлов вперемешку) —
> это нарушение закона №4. План уборки — ниже.

---

## 🧹 План уборки (🔴 устаревшее → куда; ждёт «строй» владельца)

| Что | Статус | Куда / действие | Риск |
|---|---|---|---|
| `NAVIGATION.md` | 🔴 superseded | редирект-баннер на этот INDEX (сделано) | нет |
| `restructure-2026-07/*` (5 карт плоско) | 🔴 loose | контейнер `restructure-2026-07/maps/` (датированные) | низкий, обратимо |
| `restructure-2026-07/*-PROPOSAL, REGISTRY-UNIFICATION` | 🔴 loose | `restructure-2026-07/_proposals/` | низкий |
| `brain-top-level/` (16 файлов) | 🔴 loose | `01…11-*` = ряд-спека; карты/модель → `maps/` + README-навигатор | низкий |
| `docs/_inbox/` | 🔴 растворён | убрать (только README-маркер) | низкий |
| `02-project/substrate/` | 🔴 дубль | свернуть в `01-brain` редиректом | низкий |
| `04-knowladge/` | 🔴 опечатка | `04-knowledge` или убрать до контента | низкий |
| `docs/topics/`, `docs/base/` | 📦 архив | → владеет `00-states/04-improvement-plans/PLAN-03-docs-structure.md` (S03-4: stub-указатель + развести имя `topics`) | низкий |
| единицы brain → `02-units/` | ⛔ заблокировано | ждёт 9 форков (см. PLACEMENT-AUDIT) | — |

---

## 🌳 Дерево на уровне ФАЙЛОВ (генерируемое, не рукопись)
Полное дерево `docs/` с архетипом каждой папки и флагом 🔴 «много файлов» — **`docs/_generated/doc-tree.view.md`**.
Перегенерировать в любой момент: `node tools/lint/doc-tree.mjs`. На 2026-07-21: **395 папок / 892 файла, 26 папок 🔴 с перегрузом** (топ: `base/product` 32, `session-handoff/2026-07-18-memory-unit-design` 23, `_archived/.../01-node` 18, `brain-top-level` 16).

## 🔒 Как эта карта НЕ сгниёт снова
1. Законы размещения вынесены в **`.claude/rules/doc-tree.md`** — всегда в контексте (не только по триггеру скилла). Ядро: 3 архетипа папок (numbered-ствол · plural-контейнер · `_`-служебное) + один суффиксный стандарт.
2. Эта карта — **мелкая (area-level)**, обновляется в конце каждой сессии вместе со `STATE.md`.
3. Файловый уровень — **генерируемый** авто-вид (`doc-tree.mjs`), а не рукопись (закон №8: авто-вид > рукопись).

**Последнее обновление:** 2026-07-21
