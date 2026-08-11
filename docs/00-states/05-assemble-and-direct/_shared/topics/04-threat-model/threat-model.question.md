---
node_type: question
title: "U6 — нет явной threat-model субстрата (черновик, owner принимает риск)"
status: resolved
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 9
resolution: ./synthesis/02-resolution.synthesis.md
kind: knowledge
needs-home: "kernel I-7/I-8 (PEP/policy-граница) · S2 (формы choke-point) · согласие/стирание (Ц7)"
run_index: ../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
task_pool: ../../task-pool.md
related:
  - ../03-actor-model/synthesis/02-resolution.synthesis.md
lens: инженерный/security — analyst (attack-surface из кода) + system-architect (trust-boundaries) + critic (адверсариал-гейт)
---

# U6 — Threat-model субстрата (черновик)

## Вопрос (что закрываем)
У субстрата НЕТ явной модели угроз. Итерация 8 нашла ОДНУ конкретную дыру (write-половина I-7 PEP не
подключена — `engine.ts:73-108` не зовёт `resolveWrite`). Один дефект найден случайно, при разборе актора.
**Вопрос: какова ПОЛНАЯ поверхность атаки субстрата — и какие 20% угроз несущие?** Без карты угроз мы
чиним дыры по одной, по мере натыкания, вместо систематического «где вообще можно соврать/обойти/подменить».

**Ставка (зачем сейчас).** Цель = «доверяемая композиция» (тождество·правда·согласие). Доверие = именно то,
что атакуется. Три опоры уже разобраны порознь (правда итер.6, согласие R4, тождество итер.8) — threat-model
= их пересечение под адверсариальным углом: КАК ломается доверие. Закон-1: если choke-point против класса
угроз не заложен СЕЙЧАС, его retrofit-невозможно добавить после первого прод-payload.

**Границы (что НЕ делаем).** НЕ пишем security-контроли/enforcement (это стройка, ждёт «строй»). НЕ полный
пентест. Это **черновик-карта**: перечислить классы угроз с кодовыми якорями (что РЕАЛЬНО обходимо сегодня),
отметить какие уже пойманы задачами (T-write-pep-unwired, actor-spoofing), какие 20% несущие, и какой
owner-риск-акцепт требуется. Владелец ПРИНИМАЕТ остаточный риск (не агент).

## Затравка (уже известные дыры — не выдумывать, расширять)
- **write-PEP bypass** (итер.8, `T-write-pep-unwired` 🔴): `Engine.write()` `engine.ts:73-108` не гейтит write
  через `resolveWrite` `resolve.ts:191-231`; канон обещает `invariants.md:135-140`.
- **actor/viewer/subject spoofing** (итер.8): `SubjectRef=string` на доверии `types.ts:14`; резолвера нет
  (`viewer-resolver.ts` paper-freeze); `invariants.md:54` «actor подставляется клиентом на доверии».
- **data-subject нет в коде** (итер.8, `T-data-subject-no-code`): согласие/стирание не привязано к личности.

## Призмы для команды (task-спек, шаг b)
- **analyst (attack-surface из кода):** перечислить ГРАНИЦЫ, где недоверенный вход касается субстрата —
  journal-write, PayloadStore.get/put, identity-key/same-as, fold/projection, erasure/shred, policy-как-данные
  (self-reference I-7/I-8). Для каждой: что сегодня НЕ проверяется (grep), какой конкретный обход. File:line.
- **system-architect (trust-boundaries):** нарисовать карту доверия — что внутри периметра, что снаружи, где
  ДОЛЖЕН быть choke-point (Закон-1) и есть ли он. Какие угрозы = отсутствующая ФОРМА (retrofit-невозможно
  заложить потом) vs отсутствующая ПОЛИТИКА (retrofit-дёшево). Пересечь с I-8 (можно ли менять policy тем же
  механизмом, что policy контролирует — self-reference, `invariants.md:261`).
- **critic (адверсариал-гейт, ДО «готово»):** какие «угрозы» — бумажные тигры (не достижимы)? Что ПРОПУЩЕНО
  (класс атаки не в списке)? Не притащили ли enforcement в форму-only? Реальны ли 20%-несущие? CLEAN/DIRTY.

## Выход
- `analyses/01-attack-surface.analysis.md` (analyst) · `analyses/02-trust-boundaries.analysis.md` (architect)
- `synthesis/01-critic-check.critic.md` (гейт) · `synthesis/02-resolution.synthesis.md` (карта + 20% + owner-risk)
- Статус `draft → resolved`; строка RUN-INDEX (итер.9); несущие угрозы → task-pool; owner-risk-accept → OWNER-QUEUE если есть.
