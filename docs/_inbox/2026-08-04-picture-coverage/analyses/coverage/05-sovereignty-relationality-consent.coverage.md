---
node_type: analysis
title: "Покрытие: Суверенность · Реляционность · Согласие (18 граней)"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../01-building-blocks.analysis.md
  - ../02-values-lenses-acts-frame.analysis.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/05-suverennost/README.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/06-relyacionnost/README.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/07-soglasie/README.md
  - ../../../../02-project/core/00-kernel/invariants.md
source:
  - packages/engine/src/core/resolve.ts
  - packages/engine/src/core/admission.ts
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/erasure.ts
  - packages/engine/src/core/envelope-validator.ts
  - packages/engine/src/core/types.ts
  - packages/engine/test/invariants.test.ts
  - packages/engine/test/capability.test.ts
  - packages/engine/test/write-plane.test.ts
  - packages/engine/test/erasure-seam.test.ts
---

# Покрытие: Суверенность · Реляционность · Согласие

> Метод: код = истина. Для каждой грани искал цепочку `вид-акта → линза/механизм → грань` в
> `packages/engine/src/core/*` + подтверждение тестом. Глубина по рубрике `02-values-lenses-acts-frame`
> §3.1. Проектная фаза — DESIGN, поэтому потолок глубины в этой картине = 2 (green-unit); ни одна из 18
> граней не имеет E2E на слое продукта (depth 3 нигде не найден).

## Таблица

| Грань | Путь (докcorroot) | Цепочка акт→линза/механизм | Глубина | V·G·R·C·Rdy | Priority | Бакет |
|---|---|---|---|---|---|---|---|
| **Суверенность (05-suverennost/)** | | | avg **1.67** | | | |
| 01 self-describing | `01-self-describing/` | `envelope-validator.ts` отказывает узлу с необъявленным `meta:type` (проверено фикстурой "undeclared type" в `invariants.test.ts:70`) | **2** green-unit | 4·1·2·2·3 | 12 | P2 |
| 02 policy-as-data | `02-policy-as-data/` | `admission.ts admitHome()` (GAP3c, HomeRegistry — injected, не в ядре) + `resolve.ts` orderedStack из `policy:access-priority`; тест `write-plane.test.ts` (one-home barrier) | **2** green-unit | 4·1·3·2·3 | 18 | P2 |
| 03 engine-contract | `03-engine-contract/` | НЕ найдено (`grep engine-contract packages/` = 0 совпадений в коде) | **1** designed-only | 4·2·4·4·1 | 8 | P3 |
| 04 foreign-residence | `04-foreign-residence/` | НЕ найдено (0 совпадений в коде; только README/IDEAS) | **1** designed-only | 4·2·3·5·1 | 4.8 | P3 |
| 05 ownership-keys | `05-ownership-keys/` | `resolve.ts` (`holdsCapability`, `grantValid`, `delegatedCapability`, grant-узлы) — обширно; тест `capability.test.ts` (S2/S6/S7/S9) | **2** green-unit | 4·1·3·2·3 | 18 | P2 |
| 06 constitutional-ceiling | `06-constitutional-ceiling/` | `resolve.ts` (`policy:constitution` clamp — `protected_namespaces`, `no_read`); тест `invariants.test.ts:234` "refuse-to-start без constitution" | **2** green-unit | 4·1·4·2·3 | 24 | P2 |
| **Реляционность (06-relyacionnost/)** | | | avg **0.67** | | | |
| 01 edge-as-citizen | `01-edge-as-citizen/` | `types.ts Edge` несёт `provenance` (non-PII source-label), но НЕТ своего `id`/`confidence`/паспорта; `validFrom/validTo` явно помечены "RESERVED, NOT folded/consumed at P1" | **1** designed (частичный шейп-скелет, не функционирует) | 3·2·3·3·2 | 12 | P2 |
| 02 typed-edges-and-cascade | `02-typed-edges-and-cascade/` | Найдена СМЕЖНАЯ, но НЕ та же машинерия: `predicates.ts` (cardinality one/many fold, write-time dedup) ≠ cascade-при-удалении-узла (последнее не найдено вообще) | **1** designed (промах цели гранью — cardinality решает другой вопрос) | 3·2·3·4·2 | 9 | P3 |
| 03 variants-and-templates | `03-variants-and-templates/` | НЕ найдено (0 совпадений `variant-of`/template→instance в коде) | **0** нет цепочки | 3·3·3·3·2 | 18 | P2 |
| 04 edge-decay | `04-edge-decay/` | Шейп-заготовка есть (`Edge.validFrom/validTo`), но явно инертна ("NOT folded/consumed"); `confidence`/`stale` не найдены вовсе | **1** designed (инертный seam) | 3·2·2·3·2 | 8 | P3 |
| 05 composition-and-emergence | `05-composition-and-emergence/` | НЕ найдено (0 совпадений group/emergent-edge в коде) | **0** нет цепочки | 3·3·2·4·1 | 4.5 | P3 |
| 06 conflict-cycles-and-scale | `06-conflict-cycles-and-scale/` | Частично: масштаб/циклы — ДА (`invariants.test.ts` loop-guard + "cost-tree walk iterative+bounded, deep chain/cycles do not overflow" = green-unit); видимость конфликта третьей стороне / "чьё это ребро" — НЕ найдено | **1** смешанная (под-грань scale=2, под-грань conflict-visibility=0, итог по неудовлетворённой части) | 3·2·3·3·2 | 12 | P2 |
| **Согласие (07-soglasie/)** | | | avg **1.33** | | | |
| 01 referent | `01-referent/` | НЕ найдено в коде (`grep referent packages/` = 0); только `README.md`/`IDEAS-CYCLE2.md` | **1** designed-only (фундаментальная грань, всё Согласие строится на ней) | 4·2·4·3·2 | 21.3 | P2 |
| 02 visibility | `02-visibility/` | `resolve.ts resolveRead()` (`visibility.readable_by`, `access.can_read`, `no_read`-ceiling, tenant-isolation); тест `invariants.test.ts` "visible-to routes through resolve()" + `capability.test.ts` | **2** green-unit | 4·1·3·2·3 | 18 | P2 |
| 03 use-vs-read | `03-use-vs-read/` | `resolve.ts valveGate()` — irreversible-действие требует `consent_event`, иначе DENY; тест `capability.test.ts` S6 | **2** green-unit | 4·1·3·2·3 | 18 | P2 |
| 04 consent-taint | `04-consent-taint/` | НЕ найдено (`grep taint packages/engine` = 0). Нет наследования согласия при агрегации/линзе — потенциальный обход `resolve()` через агрегат | **0** нет цепочки | 4·3·5·4·2 | **30** | **P1** |
| 05 revocation-erasure | `05-revocation-erasure/` | `erasure.ts` (`splitAct`/`redactAct`/`isErasureVerifiable`) — САМ автор кода называет это "SEAM, shape-level only; NOT the feature"; тест `erasure-seam.test.ts` доказывает разделимость зон. Но САМ ОТЗЫВ (consent-withdrawal tracking) — не найден, только эрейж-шейп | **2** green-unit (для erasure-seam; revocation-tracking отдельно ≈0) | 4·1·4·2·3 | 24 | P2 |
| 06 custodial-override | `06-custodial-override/` | НЕ найдено в коде. Конституционный carve-out И1/И2 (referent-consent нельзя переопределить policy владельца; hard-erase безусловен) — сформулирован в `invariants.md` "PENDING carve-out", НЕ ратифицирован (ждёт KQ-8) | **1** designed-only, причём даже сам дизайн не ратифицирован | 4·2·5·4·2 | 20 | P2 |

## Сводка

- **Суверенность:** avg depth 1.67 (6 граней: 4×green-unit(2), 2×designed(1)). Сильнее всего покрыта — policy-стек (`resolve.ts`) и capability/grants реально закодированы и тесты зелёные. Слабые места: `engine-contract` и `foreign-residence` — вообще не начаты в коде (только README/IDEAS).
- **Реляционность:** avg depth 0.67 — САМАЯ слабая из трёх корней. Только `Edge.provenance`-поле и cardinality-fold существуют как код; ни один найденный механизм не бьёт точно в грань (cardinality ≠ cascade-on-delete). `variants-and-templates` и `composition-and-emergence` — нулевые цепочки.
- **Согласие:** avg depth 1.33. `visibility`/`use-vs-read` реально закодированы в `resolve.ts` (PEP) и протестированы. Но `consent-taint` (наследование ограничения при агрегации) — ПОЛНЫЙ ноль в коде, а это прямой риск обхода `resolve()` через агрегат/линзу (I-7-смежный). `custodial-override` даже на бумаге не ратифицирован.

### Топ-дыры (Priority)
1. **Согласие/04 consent-taint** — P1 (30). Нет наследования согласия при агрегации/линзе; риск = обход PEP через агрегат.
2. **Согласие/01 referent** — P2 (21.3). Фундаментальная грань (referent≠owner≠author) не начата в коде — на неё опираются 02-06.
3. **Согласие/06 custodial-override** — P2 (20). Конституционный carve-out И1/И2 не ратифицирован (KQ-8 open).
4. **Реляционность/03 variants-and-templates** — P2 (18). variant-of/шаблон→экземпляр — нулевая цепочка, при этом заявлен как ключевой для Тождества-смежной модели веток.

### Пробелы данных
- Не проверял `packages/` за пределами `engine/src/core` построчно (напр. `adapters/`, `surface/`) — часть designed-only граней (`foreign-residence`, `composition-and-emergence`) могла получить частичный код там, не найденный grep'ом по core.
- Оценки V/R/C/Rdy — мои экспертные баллы по рубрике `02-values-lenses-acts-frame.analysis.md` §4, не ратифицированы владельцем; при расхождении во мнениях числа Priority пересчитать.
