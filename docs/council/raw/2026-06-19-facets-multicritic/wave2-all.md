# RAW — Мульти-критика граней, ВОЛНА 2 (перекрёст + пересмотр своих) · 2026-06-19
> Каждый критик увидел позиции других, отреагировал и ПЕРЕСМОТРЕЛ свои сомнения. Condensed-faithful.

## Критик 1 (минимализм) — сдвиги
- Reactivity вне паспорта: согласен (выс). Trust: ОСПОРИЛ полное расщепление — одна грань с 2 полями (epistemic+valve); но если valve не в ноде, ИИ не знает можно ли действовать (риск). Relation: частично согл — в ноде max `home`(+`branch_ref`). Scope: согл, схлопывается (выс). Temporal: согл — остаётся created+updated; supersedes→ребро; occurred/valid→MODULE.
- **Пересмотр:** [D1] Trust+Provenance→Credibility СМЯГЧИЛ — C3 убедил: в паспорт только `source`, а `actor`+`trace`→движок/observability. [D2] Belonging+Scope УСИЛИЛ (3/4 согласны). Freshness держит. «11 не минимум» подтверждён.
- **Финал:** строгий тест → ядро 4-5 граней: Identity(id+type, без заголовка), Belonging(home+cascade, без Scope), Temporal(created+updated), Trust(epistemic+valve+source), Relation только как мин. указатель. Reactivity/Workflow/Branches — вон. +Sensitivity/Freshness компенсируют → 5-6 содержательных.

## Критик 2 (полнота) — сдвиги
- Reactivity: согл (выс). Trust: epistemic в ядро, valve — флаг в ядре (не политика целиком), C3 прав про valve. **Relation: ОСПОРИЛ (выс) — Relation в ядре, без рёбер паспорт = изолированные узлы, ИИ теряет навигацию.** Branches: согл вне. Scope: диагноз согл, но не растворять полностью — сжать (namespace+principal_id). Temporal: согл (supersedes→ребро, 3 времени). Provenance: согл с C3 (source-ядро, actor/trace-движок).
- **Пересмотр:** ДЕРЖИТ Sensitivity (ядро — движок не решит «показывать ли» без флага) и Canonical/Dedup (ядро — дедуп базовая операция). СМЯГЧАЕТ Freshness→sub-field Temporal; Importance→sub-field Belonging (явный). СНИМАЕТ Archived (поле Temporal), Confidence (не срочно).
- **Финал:** минималисты правы в диагнозе раздутости, но Relation убирать нельзя. Ядро: Identity·Belonging(+importance)·Relation·Temporal(+stale,-supersedes)·Trust(epistemic+valve-флаг)·Provenance(source)·Scope(сжат)·Sensitivity·Canonical = **8 граней** (2 из них — расширения). «Минимум, при котором паспорт держит обещание».

## Критик 3 (границы) — сдвиги
- Reactivity: согл, снимает спор. Trust: согл с расщеплением, valve=enforcement rule движка (не денормализовать политику в данные). Relation/Branches: согл оба→ENGINE (в паспорте max home_id). Scope: согл, призрак. Temporal: согл (created/updated ядро; occurred/valid MODULE; supersedes ENGINE-ребро).
- **Пересмотр под аргументом C2 (Sensitivity/Dedup/Importance/Freshness):** прогнал через строгий тест → **ПРИНЯЛ Sensitivity в ядро** (реальное упущение волны-1; `epistemic ⟂ sensitivity`). ОТКЛОНИЛ: Importance (типо-зависима/вычислима→ENGINE), Dedup (ENGINE-механика; canonical_id=поле движка), Freshness (покрыто Temporal/вычислимо).
- **Финал:** проходят строгий тест 4 грани: Identity(id+type), Belonging(home_id), Temporal(системное время), Trust(epistemic+sensitivity). +source под вопросом (5-е поле). Relation→ENGINE (самое сильное исправление: в канвасе непоследовательно — Branches уже ENGINE, Relation нет). Ядро = 4 грани / 5-6 полей — вдвое меньше 7.

## Критик 4 (ортогональность) — сдвиги
- Reactivity: согл (выс). Trust: ДЕРЖИТ epistemic=ось; valve СНИМАЕТ как отдельную ось → политика движка + опциональный explicit-override на ноде (принял C3 на 70%). **Relation: ОСПОРИЛ — ИИ обязан знать рёбра без вскрытия (навигация) → в ядре.** Branches: вон. Scope: частично — `principal`(арендатор) бездомен без слота, нельзя полностью убрать, только сжать. Temporal: supersedes→ребро (держит выс); **СНЯЛ tri-temporal split — это поля одной грани, не оси** (перегнул).
- **Пересмотр:** D1 Trust=2оси → уточнил: epistemic ось, valve политика+override (не ось). D2 Provenance→принял C3 (source в паспорт, actor/trace движок). D3 Scope→смягчил (principal в Belonging). D5 tri-temporal→СНЯЛ.
- **Финал:** ядро 4-5 граней (Identity, Belonging+principal, Relation, Temporal, Epistemic/Trust); Provenance→source-поле; Reactivity/Branches→ENGINE. Главное расхождение осталось — Scope/principal (нужен слот) и Relation (он держит в ядре).

## ИТОГ перекрёста — что устоялось vs что осталось спорным
КОНСЕНСУС (3-4/4 после пересмотра): Reactivity вне паспорта · Branches вне (ENGINE) · Workflow вне (MODULE) · supersedes→ребро · Temporal ядро=created/updated (occurred/valid→MODULE; 3 времени=поля не оси) · Provenance→`source` в ядро, actor/trace→движок · Scope растворяется (кроме principal) · **Trust: epistemic=ось ядра; valve=политика движка+опц.override (НЕ ось)** · **Sensitivity ВХОДИТ в ядро (epistemic ⟂ sensitivity)** · Importance→sub-field Belonging · Freshness→sub-field Temporal · ядро раздуто ~вдвое (11→~5).
ОСТАЛОСЬ СПОРНЫМ: (A) **Relation — ядро или движок?** 2:2 (C2,C4 ядро/навигация; C1,C3 движок, в паспорте только home). (B) **Dedup/canonical** — ядро (C2) vs поле движка (C1,C3,C4 склонны). (C) **principal/арендатор** — где живёт слот (C4 нужен отдельный; C1,C3 движок/ABAC).
