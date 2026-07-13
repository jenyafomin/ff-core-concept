# ADR-C4 — Provenance, Certification и governance Combination (черновик-контекст)

- **Status:** draft (context only) · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Related: M4, M7, `../DECISIONS-LOG.md` (CDL-14,15,16), CV5

## Context
Marketplace требует доверия: (1) какой код что утверждал; (2) «валидный ли модуль». Fable: штамп
`module@version` + conformance-suite. Critic: conformance физически требует **sandbox-рантайм** (чужой код)
→ тезис «Combination без движка» падает; и сама Combination версионируется (правила гейтов эволюционируют).

## Decision (направление)
1. **Provenance:** штамп `module@version` на КАЖДОЙ записи (ретрофит невозможен — заложить сразу).
2. **Certification:** conformance-suite = исполняемые проверки (манифест валиден; политики ≤ Конституции;
   scratch перестраиваем; erase-hook работает; поведение портов). Прогон в **тонком sandbox-рантайме** M7 —
   Combination честно признаёт его своим (скоуп = гейт, НЕ данные/бизнес-логика).
3. **Governance-версия Combination:** правила гейтов версионируются; политика ре-сертификации ранее
   одобренных модулей (не ретро-молчаливый провал).

## Открыто
Модель подписи; sandbox-технология (CQ3); политика ре-сертификации.
