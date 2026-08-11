---
node_type: open-question
title: "Register — every open question from the erasure-meaning concept wave (2026-08-06), triaged"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
related:
  - ../analyses/00-SYNTHESIS-what-erasure-means.design.md
  - ../README.md
  - ../../../../../../../architecture/ADR/ADR-0007-erasure-and-admission.md
  - ../../../../../../../architecture/ADR/ADR-0009-erasure-witness-and-recursive-seam.md
---

> **🟢 RESOLUTION UPDATE (2026-08-07, владелец «строй» → ADR-0009).** Три беты Fable-раунда
> **РАТИФИЦИРОВАНЫ** и закрыты тонким ADR-0009 (`docs/architecture/ADR/ADR-0009-erasure-witness-and-recursive-seam.md`):
> **Q-ERA-01r → resolved** (свидетель = соль-в-blob `sha256(соль‖payload)`, key-store не нужен; Ц-7 берёт
> пост-erasure content-confirmability, Ц-3 держит pre-erasure tamper-evidence; `payloadRef` ⟂ `payloadHash`).
> **Q-ERA-07 → resolved** (`hashScheme`-шов закладывается сейчас, машинерия key-store — по триггеру первой
> второй-копии). **Q-ERA-03 → resolved** (рекурсивный шов: забвение достаёт опознающее внутри монумента,
> включая имя заявителя; остаётся неопознающий структурный факт). Осталось владельцу (НЕ решено ADR-0009,
> **deferred-gating-monument**): **R3** порог анонимности топологии (→ ADR-0007 OQ-3) · **R4** классы
> «режим-B» не-впускать-даже-факт (→ ADR-0007 OQ-4) · **R5** подпись под остаточным риском (после
> контракта порта `shred`) · carve-out I-4 для монумент-содержимого (ратификация в `invariants.md`).

# Register — open questions on "what erasure means" (triaged)

> Consolidates every open question raised by the 2026-08-06 wave (`analyses/00-SYNTHESIS`, `01-erasure-semantics`,
> `02-erasure-boundaries`, `03-erasure-substrate-grounding`) plus the pre-existing forks in `../README.md`,
> cross-checked against ADR-0007 for forced answers. LOSE-NOTHING: nothing here is re-derived elsewhere — this
> is the one home for the question, not the answer-in-progress (answers/resolutions live in the source docs;
> this table is the index + triage).

## T1 — Rhetorical / self-answering (dissolve; forced by a value or an already-made decision)

| id | question | source | forced answer / what forces it |
|---|---|---|---|
| Q-ERA-04 | ADR shape for the port/boundary decision: new `ADR-0008` sub-record vs amend `ADR-0007 §(f)`? | 00-SYNTHESIS OQ-D; 03-substrate §4 | **ADR-0008 thin sub-record**, scoped to Stage-1 boundary only — forced by doc-tree law #2 (one home per theme; boundary ≠ policy) and ADR-0007's own precedent (itself sub-recorded from ADR-0006). |
| Q-ERA-05 | Shred-tombstone (`isShredded`) lives in the port itself, or as an `erased`-act lookup engine consults before `put`? | 03-substrate OQ-A | **Port-local** — forced by the "ingest stays a dumb adapter" principle already adopted in the port design (§2). |
| Q-ERA-06 | Lift the WHOLE `PayloadStore` port into engine, or a narrow `ShredablePayloadSink` (richer put/get stays in ingest)? | 03-substrate OQ-B | **Narrow `ShredablePayloadSink`** — forced by minimal-surface/no-cycle principle (smallest engine surface, no cycle). |
| Q-ERA-08 | Reserve "UNREACHABLE" as an explicit public vocabulary/API name, distinct from "erasure" (kept for future NON-EXISTENT)? | 02-boundaries closing Q1 | **Yes, rename/reserve explicitly** — forced by the wave's own honesty rule (label must never claim more than delivered). Not a real toss-up, an application of an already-adopted invariant. |
| Q-ERA-10 | Are boundaries #7 (Г20 no-channel third party) and #8 (uncovered derivatives) ONE owner-fork or TWO separate? | 02-boundaries closing Q3 | **Keep separate** — the doc's own framing already answers this: they require different decision types (access-policy vs engineering task); merging would conflate them. |
| Q-ERA-11 | FQ7: one forgetting mechanism or two (soft-sleep reversible + hard-erase irreversible)? | README Развилка 1 / FQ7 | **Two primitives**, confirmed — one mechanism cannot deliver reversible-unreachable (Ц-4) AND irreversible-non-existent (Ц-7) at once; collapsing them = "the canon lies." Not new, but now grounded in values, not just mechanics. |
| Q-ERA-12 | `canonical_id` fate at hard-erase: keep-id tombstone vs full release (edges break)? | README Развилка 2 / Q-hard-erase-id | **Keep-id tombstone** — forced by Ц-6 Реляционность (no dangling edges) + Ц-2 Тождество (identity continuity). |
| Q-ERA-15 | Forgetting-guarantee for derivatives (embeddings/indexes/cache): require it now even though the mechanism is deferred? | README Развилка 5; 02-boundaries #8; 03-substrate Stage-N | **Yes — as a process rule**: any future derivative module MUST declare participation in the erasure-contour when founded; silence = not covered. The mechanism itself stays genuinely unsolved (Stage-N/reserved) — only the requirement-now question dissolves. |

## T3 — False binary → BOTH under a named condition (the owner's key lens)

| id | question | variant A | variant B | condition / predicate | source |
|---|---|---|---|---|---|
| Q-ERA-02 | Is a sovereign plugin's own `PayloadStore` INSIDE the erasure contour or OUTSIDE? | **Inside**: store implements the shred-contract → real PII may live there | **Outside**: store cannot/does not implement shred-contract → admission-gate must forbid real PII there | Does the store conform to the shred-contract? | 00-SYNTHESIS OQ-B; 01-semantics closing Q2; 03-substrate (Fable §3.1) |
| Q-ERA-13 | Cascade of revocation to descendants: full cascade vs point-only? | **Cascade**: strict `derived-from`/materializations (view/cache/embedding — "no life of their own") | **Taint, not delete**: independent `assertion-edge` descendants (own memory, Ц-6) | Edge type: derived-from (materialized) vs assertion-edge (independent) | README Развилка 3; 01-semantics §T-cascade/A8 — **proposed closure of ADR-0007 OQ-5, pending ratification back into that ADR** |
| Q-ERA-16 | Г20: does "hard-erase unconditional" (И2) apply to a referent with no account/channel? | **Self / has-channel**: unconditional hard-erase enforced as designed | **Third-party / no-channel**: excluded from plugin/marketplace contour + flagged at passportization (`referent-class` field) until a proxy-request mechanism exists | Does the referent have a channel/account to request erasure? | 02-boundaries #7; README "Входит"; pointer → ADR-0007 OQ-4 (same territory — the proxy-request *mechanism* for channel-less third parties stays genuinely unsolved, T2, homed at ADR-0007) |
| Q-ERA-01 | Witness paradox: `payloadHash` is both trust-witness (persist, Ц-3) and consent-oracle (must not persist, Ц-7). | **Keep plain hash** as a safe witness | **No plain hash** (oracle) → admission-refuse now / keyed-shred later | **Entropy of the payload**: high-entropy → hash is not a practical oracle (keep); low-entropy PII (phone/email) → hash IS the oracle | 00-SYNTHESIS OQ-A; 01-semantics §4 T-witness; 02-boundaries #5 — **general case dissolves on entropy; the low-entropy branch's residual bet = Q-ERA-01r (T2 below)** |
| Q-ERA-09 | R1-gate ("no real PII until by-ref shred closes", `erasure.ts:14-17`) enforcement. | **Technical gate** required | **Written agreement** sufficient | **Contour**: production real-ingest → technical gate; dev/test-only (synthetic PII) → written agreement | 02-boundaries closing Q2 (reconciled: abstract-thinker predicate; distinct from ADR-0007 R-G3.4 schema gate) |
| Q-ERA-14 | Who executes revocation and when: synchronous vs background-SLA? | **Synchronous** engine duty | **Bounded-SLA background** | **In-reach vs cross-boundary**: in-substrate materializations (primary store's own act) → sync; propagation to backups/replicas/external/embeddings → bounded-SLA background | README Развилка 4 (reconciled: analyst flagged + abstract-thinker independently converged on this predicate; the SLA-bound *value* stays a param to set → see Q-ERA-14r) |

## T2 — Real forks (irreducible either/or, owner decides) — kept small and honest

> Reconciled across two lenses (analyst register + abstract-thinker critique): the owner's "is BOTH possible under a condition?"
> lens moved Q-ERA-09 and Q-ERA-14 up into T3, and split Q-ERA-01 (general → T3 on entropy; only the low-entropy branch stays irreducible).
> The genuinely irreducible bets shrink to **3** (Q-ERA-07, Q-ERA-01r, Q-ERA-03) plus two conditioned-value *parameters* (Q-ERA-14r).

| id | question | trade-off axis | owner decision needed | source |
|---|---|---|---|---|
| Q-ERA-07 | ✅ **RESOLVED (ADR-0009 ②).** `hashScheme`-шов закладывается сейчас (единственная ретрофит-невозможная поверхность); машинерия key-store — по триггеру первой второй-копии. Расцеплен ходом (d) из 01r. | Build-now cost/complexity vs retrofit-impossible risk later | ~~timing bet~~ → закрыт | 03-substrate OQ-C → **ADR-0009** |
| Q-ERA-01r | ✅ **RESOLVED (ADR-0009 ①).** Свидетель = соль-в-blob `sha256(соль‖payload)`, соль умирает shred'ом → key-store не нужен. Ц-7 забирает пост-erasure content-confirmability (умирает с солью); Ц-3 держит pre-erasure tamper-evidence. `payloadRef` ⟂ `payloadHash`. Конструкция свидетеля = функция admission-класса энтропии. | Ц-3 Доверие ⟂ Ц-7 Согласие | ~~confirm a/b/c~~ → ход (d) ратифицирован | 00-SYNTHESIS OQ-A; 01-semantics §4 T-witness → **ADR-0009** |
| Q-ERA-03 | ✅ **RESOLVED (ADR-0009 ③).** Рекурсивный шов: забвение достаёт опознающее ВНУТРИ монумента (включая имя заявителя); остаётся неопознающий структурный факт. Дефолт «No до анонимного факта» подтверждён. Остаток топологии → **deferred R3** (дом ADR-0007 OQ-3). | Value-derived default = content-only (No); some legal regimes may require Yes | ~~legal/owner-rank~~ → рамка сломана; остаток = R3 | 00-SYNTHESIS OQ-C; 01-semantics closing Q3; pointer → ADR-0007 OQ-3 → **ADR-0009** |
| Q-ERA-14r | The SLA-bound *value* for background propagation (the param inside Q-ERA-14's T3 split): how long a visibility window is acceptable after revocation? | Tightness of guarantee vs cost/scale | A number/policy to set once Q-ERA-14's predicate is adopted — not a fork, a parameter | README Развилка 4 |

## Fable-раунд (2026-08-06) — 3 бета РЕШЕНЫ до ратификации (каждая — своя папка-узел)

Каждый сложный вопрос вынесен из монолита в **свою папку-узел** (обсуждение внутри, потенциал роста → ADR):

- **`01-low-entropy-pii-witness/`** (Q-ERA-01r) → **РЕШЕНО.** Fable сломал трихотомию: **ход (d) — соль
  внутри erasable-зоны** (`sha256(соль‖payload)`); соль умирает shred'ом → **key-store не нужен**. Для
  низкоэнтропии верифицируемость и оракул = одна способность → Ц-7 берёт этот один атом. Ратифицировать
  1 предложение. **Расцепляет Q-ERA-07.**
- **`02-stage2-keystore-timing/`** (Q-ERA-07) → **РЕШЕНО (T3).** Предикат нашёлся — **топология
  «одна копия vs много»**: шов (`hashScheme`) заложить сейчас, машинерию — по триггеру первой второй-копии.
  **Если принят (d) из 01r — вопрос почти растворяется.**
- **`03-forgetting-reaches-monument/`** (Q-ERA-03) → **РЕШЕНО (рамка сломана).** «Шов РЕКУРСИВЕН»:
  забвение достаёт всё идентифицирующее, включая ИМЯ ЗАЯВИТЕЛЯ внутри монумента; остаётся неидентифицирующий
  структурный факт. Остаток (топология рёбер) → дом ADR-0007 OQ-3. Ратифицировать 1 предложение +
  **3 юр-развилки только владельцу**.

> Итог раунда: «неснимаемые» T2 не устояли — Fable перевёл каждую в **одно ратификационное предложение**
> (01r и 03) или T3-предикат (07). Осталось владельцу: **ратифицировать 2 предложения + 3 юридических выбора**.

## Pointers — questions with a home elsewhere (not duplicated here)

- **ADR-0007 OQ-1** (key granularity vs collateral-erasure) — homed at ADR-0007; 03-substrate stages it to Stage-2.
- **ADR-0007 OQ-2** (off-graph taint-closure / "SLOMAN") — homed at ADR-0007; 03-substrate stages it to Stage-N (reserved).
- **ADR-0007 OQ-4** (R-ERASE / role-priority conflict) — homed at ADR-0007; the labeling/admission layer for the channel-less-third-party case is triaged above as Q-ERA-16 (T3), but the underlying proxy-request mechanism stays with ADR-0007 OQ-4.
- **ADR-0007 OQ-7** (file-first `shred` vs git-history) — homed at ADR-0007; 03-substrate stages it to Stage-N (reserved), tied to Block-4 council.
- **02-boundaries item #3** (dedup/content-addressed collateral erase) and **item #9** (shred-atomicity/crash-safety, tracked as fork **F3**) — findings with prescribed honest-labeling actions already in `02-erasure-boundaries-and-reserved-guarantees.design.md`; not independent owner questions, no new register entry needed.

## What moves the direction (after two-lens reconciliation)

**8** questions **dissolve outright** (T1 — forced by a value or an already-adopted principle; no owner time).
**6** reframe from apparent either/or into **both, under a named predicate** (T3 — reach boundary, cascade,
Г20 label, witness-by-entropy, R1-gate-by-contour, executor-by-in-reach-vs-cross-boundary; each resolves to a
condition on the data/act, not a pick).
**3** remain **genuinely irreducible** owner bets — and only these need real deliberation:
- **Q-ERA-07** — Stage-2 key-store: lay the crypto-shred seam NOW (retrofit-impossible) or wait for a real backup. *A timing bet, no data predicate.*
- **Q-ERA-01r** — low-entropy PII: admission-refuse-now (default) / keyed-shred later / accept written risk. *The one true Ц-3⟂Ц-7 clash.*
- **Q-ERA-03** — does forgetting reach the fact-monument itself, or only content? *Default = content-only; a legal-regime call.*
Plus **Q-ERA-14r**, a *parameter* not a fork (the acceptable post-revocation visibility window).

Net: the owner's "is BOTH possible under a condition?" lens shrank a 16-item fan-out to **3 real decisions** (two with a pre-leaned default to just confirm) — that is what lets the direction move.
