---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-27
Scope: project
node_type: spec
title: Спек инжеста v2 — ingest-as-acts (CQRS-верно, суперсед 01-ingest-slice)
Supersedes: ./01-ingest-slice.spec.md
Related:
  - ../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md          # M1 = ingest-as-acts + rebuild-from-journal (Validation §1,§2)
  - ../../../architecture/ADR/ADR-0007-erasure-and-admission.md        # PII через payloadRef + admission-gate (G3 = предусловие M1)
  - ../../../architecture/ADR/ADR-0006-persistence-as-policy.md        # file-first payload по policy (F-B дефолт)
  - ../../../02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md  # act-kind = domain_event для строк-фактов
  - ../../../_log/2026-07-27-m1-build-prep/SYNTHESIS.md                # почему v1 переписан (C1-C3 + M0-разрыв)
  - ../../../_log/2026-07-27-m1-build-prep/data-verification.analysis.md  # ключ ^\d+-\d+, SOLD-плейт, мусорные ячейки
---

# Спек инжеста v2 — ingest-as-acts (аренда)

> **Зачем v2.** v1 (`01-ingest-slice.spec.md`) написан ДО ратификации CQRS/admission и описывал upsert-мутацию
> узла (`version`/`tombstone` НА узле) — это нарушает ADR-0008 (граф = проекция лога, не второй источник истины).
> Три агента это подтвердили (SYNTHESIS). v2 переписывает срез в терминах **актов**. v1 → `superseded`
> (контент не удалён, LOSE-NOTHING).

## 0. Ратифицированные решения этого среза
- **A (граница M1) — уточнено по ADR-0008:** M1 = **ingest-as-`domain_event`-акты + базовая проекция
  (`rebuild-from-journal`)**. Проекция ОБЯЗАНА быть — это центральный CQRS-гейт (ADR-0008 Validation §2).
  В M2 уезжают: `observation`-акты (факты из чата, T4) и `same-as`-дедуп-линза (T3).
- **B (где живёт PII):** имя/телефон/`Recent Note` — НЕ inline в акте; уходят в **payload-store по `payloadHash`,
  file-first** (ADR-0006 дефолт). Акт несёт только `payloadRef`+`payloadHash`.
- **C (факт из чата):** отдельный `observation`-акт через insight-ребро (act-kinds §1) — синк его НЕ трогает. → M2.
- **F-D (открыто, за владельцем):** полный экспорт Orders для T2 на 4102 строках. До него — фикстура (сэмпл + синтетика).

## 1. Границы среза
- **В срезе:** листы **Orders** и **Cars** → `domain_event`-акты → проекция в узлы `order`/`car` (+ `customer` как
  производный узел, БЕЗ дедупа — просто per-occurrence, дедуп в M2).
- **Вырезано → M2/позже:** факты из `Recent Note` (заносим сырьём в payload, не парсим), `same-as`-дедуп клиентов
  (T3), листы Transactions/Fines/Maintenance (у них свои швы, см. analysis — перепутанные колонки, нетабличный мусор).

## 2. Модель акта (write-model)
Каждая строка-факт → один **`domain_event`** (act-kinds §1: бизнес-факт, меняет каноническое состояние, реплеится,
`core:write-knowledge` grant). Конверт (заморожен на M0, S4):
```jsonc
{
  "id": "...",                       // движок-присвоенный
  "kind": "domain_event",
  "actorId": "sync:ga-rentacar",
  "scopeId": "ga-rentacar",          // project-скоуп (грубый), D4
  "recordedAt": "<engine-assigned>", // system-time, иммутабелен
  "provenance": { "source_ref": "sheets:Orders#45832-2865", "snapshotHash": "<hash полей>" },
  "edges": [ /* rented / drives — meta БЕЗ inline-PII */ ],
  "payloadRef": "payload://<hash>",  // сюда name/phone/note
  "payloadHash": "<hash>"
}
```

## 3. Ключ идемпотентности `source_ref` (устойчивый)
- **Order:** `sheets:Orders#<numCore>`, где `numCore` = **leading-regex `^\d+-\d+`** по колонке `#`
  (analysis: хвосты приклеены НЕПОСЛЕДОВАТЕЛЬНО — `[AL]` через пробел, `Long term` слитно; резать по списку — хрупко).
  Всё после `\d+-\d+` игнорируется. Пустой/битый `#` → строка НЕ порождает акт (см. §7 карантин).
- **Car:** `sheets:Cars#<Plate No>`. ⚠️ `SOLD-*` = плейсхолдер проданной машины (не реальный номер) → такие строки
  метятся `placeholder_plate` и НЕ используют плейт как натуральный ключ (иначе все проданные схлопнутся в один узел).
- **Customer:** без натурального ключа — `sheets:Orders#<numCore>:customer` (клиент-как-в-этом-заказе). Дедуп → M2.
- `numCore`/ключ вычисляются **детерминированно в редьюсере инжеста** (не «на write-time на глаз») — чтобы баг
  парсинга не впечатался в акты навсегда (critic-concern).

## 4. Идемпотентность (T1) — на слое акта, не мутацией узла
- Матч по `source_ref`. Если акт с тем же `source_ref` И тем же `snapshotHash` уже в логе → **0 новых актов**.
- `snapshotHash` изменился (upstream-строка поменялась) → **новый `domain_event`** (superseding, лог растёт; НЕ
  вторая запись узла). «Версия» узла = проекция числа актов, а не поле, которое кто-то мутирует.
- Строка исчезла из Sheets → `domain_event` вида `archived` по тому же `source_ref` → проекция помечает узел
  `tombstone=archived` (tombstone — вывод проекции из акта, не мутация).

## 5. PII / admission (ADR-0007 G3 — предусловие M1)
- Структурные PII-поля (`name`/`phone`/`Recent Note` и пр.) → **payload-store, file-first по `payloadHash`**; акт
  несёт `payloadRef`+`payloadHash`. Inline в акте — ЗАПРЕЩЕНО.
- Admission-gate (уже усилен: сканирует `payload` И `edges[].meta`) отказывает inline-PII fail-closed ДО записи.
- **Тест G3:** `grep журнала по телефону/email = 0` (PII не течёт в лог).

## 6. Проекция / rebuild (ADR-0008 Validation §2 — центральный гейт M1)
- `rebuild(state) = reduce(acts[].filter(kind=='domain_event'), initial)` → узлы `order`/`car`/`customer` с паспортом
  (поля из snapshot; `version` = глубина цепочки актов; `tombstone` из `archived`-акта).
- **Assert:** снести current-state + индекс, пересобрать из `acts[]` → **бит-в-бит эквивалентно** (0 потери знания).
  Провал = граф несёт истину, которой нет в логе → ветка B, нарушение ADR-0008.

## 7. Реальность данных (из analysis — не упускаем)
- Пустой/битый `#` (нетабличный мусор, напр. `"Check Levels:"`) → строка в **карантин**: не порождает акт,
  инкремент счётчика `quarantined`, лог-строка. НЕ молчаливый пропуск (видимость).
- `SOLD-*` плейт → `placeholder_plate` (см. §3).
- `Remaining` < 0 (переплата) — валидно, не ошибка.
- Дубль строки в самом Sheets (тот же `numCore`+snapshot) → идемпотентность §4 схлопнет в 0 новых актов
  (не отличаем от повторного синка — приемлемо для M1; «дубль vs коллизия ключа» — открытый вопрос N3, ждёт F-D).

## 8. Абстракция портов (малый прирост, plug-in позже)
- **`RowSource` port** — `readRows(sheet): Row[]`. M1: **fixture-адаптер** (сэмпл `*.peek.json` + синтетика для тестов).
  Реальный Sheets/PG-адаптер подключается за тем же портом **после F-D** (доступ к данным/секретам — за владельцем).
- Инжест зависит от `@ff/engine` (`write(act)` + `rebuild`), не форкает движок.

## 9. DoD — критерии «готово»
| # | Прогон | Ожидаемо | Слой |
|---|---|---|---|
| **T1** | Синк дважды подряд (fixture) | 2-й прогон = **0 новых актов** | акт (идемпотентность) |
| **G3** | Синтетический акт с inline-PII (payload И edge-meta) | **REFUSED** до записи; `grep журнала = 0 PII` | admission |
| **RB** | Снести проекцию → `rebuild --from journal` | граф **бит-в-бит** эквивалентен | проекция (CQRS-центр) |
| **QN** | Строки с битым `#` | в карантине, счётчик > 0, лог | видимость |
| **T2** | Уникальность `numCore` по **4102** строкам | 0 коллизий | ⏳ **GATED на F-D** (fixture ≠ полные данные) |
| T3/T4 | дедуп `same-as` · факт из чата | — | → **M2** |

**Срез M1 засчитан, если T1 + G3 + RB + QN зелёные на фикстуре.** T2 — открытый гейт до полных данных (F-D).

## 10. Открыто (владелец)
- **F-D:** не-секретный экспорт Orders (4102) или санкция на безопасный путь к БД → закрыть T2.
- **Продакшн genesis-policy** (`policy:constitution` реальный контент: protected namespaces / no_read) — сейчас в
  движке только тест-фикстура; реальный seed = решение владельца (T4-трек).
