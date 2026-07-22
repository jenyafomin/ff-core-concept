---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: gap-review
lens: settings
Related:
  - ../2026-07-12-SYNTHESIS-matrix.md
  - ../modules/M-G1-memory-engine/README.md
  - ../modules/M-G2-orchestrator/README.md
  - ../modules/M-G3-type-registry-policy/README.md
  - ../modules/M-G4-locality-residency/README.md
  - ../modules/M-G5-identity-self/README.md
  - ../modules/M-P3-loops/README.md
  - ../../../01-overview/02-domains/01-knowledge-graph/02-entities/node-types.md
  - ../../../01-overview/02-domains/01-knowledge-graph/03-relations/edge-types.md
  - ../../../01-overview/02-domains/01-knowledge-graph/05-policy/policy.md
  - ../../../../02-agents/01-orchestration/node-types.md
  - ../../../../02-agents/01-orchestration/policy.md
  - ../../2026-07-12-fable-series/2026-07-12-fable-db-module/00-SYNTHESIS.md
---

# G2 — Реестр главных полей-настроек (лупа: НАСТРОЙКИ)

> Вопрос владельца: «какие самые главные ПОЛЯ для настройки всего этого?» Собрано из 6 module-README +
> 2 домена + FABLE-DB синтеза. Единица = поле паспорта/policy/слота, не сущность целиком.

## 1. Реестр полей

### (a) Паспорт УЗЛА — общий на КАЖДОМ узле (node-types.md L16-18)
| Поле | Настраивает | Значения |
|---|---|---|
| `canonicalId` | стабильный адрес (не настройка, но корень остальных) | UUID |
| `scope` | кому видно/принадлежит | `private\|project\|shared\|global` |
| `storageLevel` | где физически истина | `ephemeral\|session\|local\|project-db\|global-db` |
| `ownerId/tenantId` | граница владения (от `root-self`, M-G5) | id |
| `committed` | черновик vs зафиксировано | bool |
| `localOnly` | не всплывать выше scope | bool |
| `provenance` | источник факта | ref |
| `salience` | вес витальности (только `cell`) | policy-число |
| `authority` (policy-node) | уровень обязательности | `constitutional\|cell` |

### (b) Паспорт РЕБРА
| Поле | Настраивает | Значения |
|---|---|---|
| класс ребра | режим хранения связи | `thin-ref \| assertion-edge` |
| `edge-type` | семантика (открытый seed-реестр) | home/member-of/caused/derived-from/… |
| `provenance` (assertion) | кто утверждает | ref |
| consent-taint (Ц-7) | нужен ли consent-gate | flag на `shared-with`-подобных |
| DAG-инвариант | допустим ли цикл | on/off на derived/cascade рёбрах |
| реактивный триггер (слот) | 🟡 зарезервировано, не исполняется | флаг на assertion-edge |

### (c) Policy-поля (M-G3, оба домена)
| Поле | Настраивает | Значения/пример |
|---|---|---|
| `subject` | на что действует policy | node-type/edge-type/personalityId/slotId |
| `rule` | форма правила | constraint / default / valve |
| `valueRef` | какая из 7 ценностей питает | Ц-1…Ц-7 |
| `cascadeLevel` | место в каскаде | constitution\|policy\|integrity |
| `scope`+`applies-to` | глобально/проектно | global\|project + цель |
| Примеры policy-узлов | конкретные ручки | `propagation-policy`(depth/staleness) · `residency-default-policy`(дефолт scope/storageLevel) · `matrix-policy`(допустимые пары scope×storageLevel) · `sharing-policy`(cache/copy при shared) · `verifierPolicy` · `breakerPolicy`(threshold/window/cooldown) · `costPolicy`(dailyCap/earlyExit) · `humanGatePolicy` · `AgentPolicy`(модель/rate-limit/tools/cost-cap) · `merge-policy`(same-as tie-break) |

### (d) Слот/сессия (M-G2)
| Поле | Настраивает | Значения |
|---|---|---|
| `mode` | режим слота | `bound\|background\|task` |
| `replicaOf` | репликация (память НЕ шарится) | slotId? |
| `boundConversationRef/boundTopicId` | привязка к каналу | conversationRef |
| `personalityId` | какой шаблон исполняет | id |
| «≤1 Active» | одновременность на слот | partial-unique-index (не поле-флаг) |
| `dailyCap`/cost-cap | бюджет | число (per tenant/slot) |

### (e) Резиденция/материализация (M-G4)
| Поле | Настраивает | Значения |
|---|---|---|
| `homeStore` | адрес истины в data-plane | ref |
| `materialization` | как читать копию | `live\|cache\|copy` |
| `region/tenant` | юрисдикция | код региона/tenant |
| `derivedAt/freshness` | когда выведено, протухло ли | timestamp/TTL-подобно |

## 2. Что УПУЩЕНО
- **Язык/локаль** — нигде нет поля (ни на `profile`, ни на policy), хотя voice-pipeline уже завязан на `ru`. Нет настройки языка ответа/UI по умолчанию.
- **Ретеншн/TTL** — есть `salience`+forgetting-policy (Ц-4), но НЕТ явного «удалить через N дней/после consolidation» поля — забывание описано как процесс, не как настраиваемый срок.
- **Приоритет вне витальности** — `salience` покрывает память, но у `Task`/`Pattern` нет общего поля приоритета/срочности (только `risk`, `cadence` в Pattern).
- **Видимость АГЕНТАМ отдельно от scope** — `scope` разруливает людей/тенантов, но нет explicit ACL «какие Personality/Slot могут читать этот узел» (сам M-G4 признаёт ACL-enforcement 🟢-«позже», то есть поля пока нет).
- **Таймзона** — нигде не упомянута, хотя `occurredAt`(bitemporal), `cadence` петель, `dailyCap` — все времязависимы.
- **Уведомления/алерты** — отсутствуют как класс настроек (кому/когда пинговать при событии в журнале).
- **Consent «use vs read»** — гранулярность согласия открыта как отдельный вопрос (FQ07-soglasie/03), поле формально не закрыто.
- **Классификация чувствительности данных** (secret/pii/public) — `scope` про «кому», не про «насколько чувствительно»; нет отдельного поля для шифрования/маскирования при экспорте.
- **Версия policy на объекте** (какая версия каскада применена при записи) — есть `supersedes`, но нет явного «pinned policy version» на узле.

## 3. Минимальный must-have набор (🔴 заложить сейчас)
1. Паспорт-квинтет на КАЖДОМ узле: `canonicalId, node-type, scope, storageLevel, ownerId/tenantId, committed, localOnly, provenance`.
2. Класс ребра (`thin-ref`/`assertion-edge`) + `edge-type` из открытого seed-реестра + DAG-флаг на derived.
3. `policy-node`: `subject, rule, valueRef, cascadeLevel, scope/applies-to` — минимум чтобы каскад разрешался read-time.
4. Слот: `mode, replicaOf, personalityId, boundConversationRef` + partial-index «≤1 Active».
5. `residency-record`: `homeStore, materialization, provenance` (даже если derivedAt/freshness придёт позже).
6. **Дефолт scope при создании узла** = `private` (нигде явно не зафиксировано как default-значение — риск утечки видимости с 1-го дня).

## Unknowns remaining
- Локаль/таймзона/TTL/ACL-агентам — не в фокусе ни одного из 6 module-README; нужно решить: отдельные policy-узлы (Ц-1/Ц-4/Ц-7) или новые паспорт-колонки.
- «Дефолт scope=private» — рабочее предположение автора анализа, не ратифицировано владельцем/Fable.
