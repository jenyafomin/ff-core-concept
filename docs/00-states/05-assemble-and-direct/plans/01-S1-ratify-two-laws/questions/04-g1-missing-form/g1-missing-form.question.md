---
node_type: question
title: "U2 — Полнота G1 не фальсифицируется: red-team «какую ретрофит-невозможную форму мы забыли до S2»"
status: review   # red-team пройден одним критиком (мной); НЕ второй независимый critic-check — см. «Что не хватает»
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
kind: knowledge-candidate
lens: critic (адверсариал по Закону-1, red-team «забытая форма»)
plan: ../../README.md
serves_owner_fork: ../../../../_shared/OWNER-QUEUE.md
parent:
  - ../../../../_shared/topics/01-completeness-census/analyses/01-not-opened-questions.analysis.md   # U2 названа здесь (топ-2 пробел)
sources:
  - ../../work/two-laws.invariant-candidate.md                                                        # U-L1, 3 инстанса формы (кандидат к ратификации S1)
  - ../../../../../../_log/2026-08-07-whole-picture-and-cycle/HANDOFF.md                              # :42 — 5 ретрофит-невозможных швов (superseded, но §7-канон живёт)
  - ../../../../../../_log/2026-08-07-whole-picture-and-cycle/HANDOFF-3-ratification-and-cross.md     # :48-50 CRIT-1 (актуальный хендофф дня, active)
  - ../../../../../02-project/core/01-brain/03-unit/UNIT-SPEC-v1.design.md                            # §7 :84-93 — канонический список 5 форм
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md        # :21-28,71-78 — G1, 3 формы S2
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/SPEC-DELTA-DOCKET.md         # :67-71 сводка retrofit-НЕВОЗМОЖНО
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F1-read-pep-design.design.md # :26-47,147-164 deref-seam scope + retrofit verdict
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md  # opaque edge-identity — форма НЕ в §7
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D2-unit-spec-validation.report.md # :36,56,66-72 CRIT-1 carried OWNER-PENDING
  - ../../../../_shared/topics/02-truth-keystone/truth-keystone.question.md                           # valid-time/as-of — отдельный уже-открытый кандидат (U1)
  - ../../../../_shared/topics/02-truth-keystone/analyses/01-truth-decomposition.analysis.md          # :150-153 «может быть retrofit-НЕВОЗМОЖЕН»
  - ../../../../_shared/task-pool.md                                                                   # :425 valid-time-primitive 🔴 todo (spawned iter.6) — 0 хитов CRIT-1/ADR-0010/ADR-0011
anchors:
  - packages/engine/src/adapters/store-durable-fs.ts:171                                              # hydrateFromDisk — живой fold-путь, один из «разбросанных call-site», о которых предупреждал F1
  - packages/engine/src/core/resolve.ts:116                                                            # resolve() PEP — read:payload сегодня НЕ существует (grep 0 хитов)
  - packages/engine/src/core/types.ts:27                                                               # validFrom/validTo RESERVED — пустой шов свежести
  - packages/engine/src/core/types.ts:37                                                               # provenance? OPTIONAL — слот уже есть (не забытая форма)
  - docs/02-project/core/01-brain/03-unit/UNIT-SPEC-v1.design.md:95-99                                # §8 cut-list: рекурсивная локальность/маркетплейс/bitemporal — явно ОТЛОЖЕНЫ
---

# U2 — Red-team «какую форму мы забыли» (Закон-1, до S2)

## Вопрос (суть)
Закон-1: форма retrofit-НЕВОЗМОЖНА (append-only), забытая форма упущена НАВСЕГДА. G1 держится на РУЧНОМ
списке форм. Задача: свести расходящиеся списки (3 vs 5), red-team пройти классы retrofit-невозможного и
назвать кандидатов, НЕ покрытых текущим списком — до того как S2 заморозит формы в UNIT-SPEC-v1.1.

## Ставка
Самый дорогой класс ошибки по логике самого Закона-1 (необратим). У G2 (хребет) есть анти-тавтология-тест
(S3), у G5 (ширина) — перепись. У G1 — только доверие к памяти сессии. Разбор ниже показывает: это доверие
уже подводило один раз (opaque edge-identity не было в исходном §7-списке, найдено на день позже) и подводит
СЕЙЧАС ВТОРОЙ раз (CRIT-1 и valid-time/as-of выпадают из текста, который реально пойдёт владельцу на подпись).

## Разбор
→ `analyses/01-3vs5-reconciliation.analysis.md` — свод расходящихся списков (§7 канон-5 · U-L1 канон-3),
что перекрывается, что ново, откуда расхождение.
→ `critique/01-redteam-forgotten-forms.critic.md` — red-team проход по классам retrofit-невозможного
(identity-носители · choke-points · append-only заморозки · admission-точки), ранжированные находки,
предложенный фальсифицируемый тест G1.

## Тип и разрешение
Разбор — автономный (критик, red-team). Что ДЕЛАТЬ с находками (нести ли CRIT-1/valid-time в текст
ратификации S1, нужен ли механический lint вместо ручного списка) — **owner** решает через `OWNER-QUEUE`
(рычаг: задерживает или нет отсечку S2).

## Границы (чего эта нода НЕ делает)
- НЕ ратифицирует новые формы и не патчит UNIT-SPEC/U-L1 текст.
- НЕ решает valid-time (это уже открытый вопрос U1/truth-keystone) — только проверяет retrofit-статус и
  флагует, что он выпал из S1-ратификации.
- НЕ строит lint/CI (только предлагает форму теста).

## Что не хватает (честно)
Это ОДИН критик-проход (я), не пара «автор → независимый critic-check», потому что задача сама по себе —
адверсариальная (я и есть red-team-роль на неё). Риск смугла (нашёл ли я РЕАЛЬНО забытое, или додумал) —
частично снят требованием file:line на каждый claim (ниже) и тем, что 2 из 3 находок уже независимо
зафиксированы другими нодами этой ночи (`01-not-opened-questions.analysis.md`, `02-truth-keystone/`) —
сходимость трёх независимых проходов, не один голос. Второй независимый critic-check по ЭТОЙ ноде — не
проведён (ночной бюджет); если владелец решает нести находки в S1 — рекомендую 1 sanity-проход перед этим.
