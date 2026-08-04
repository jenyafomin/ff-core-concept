---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-31
Scope: project
node_type: ADR-draft
title: "Root scope + durable StorePort + integrity-as-engine-duty (candidate ADR-0009)"
candidate_number: ADR-0009
number_collision_flag: "0009 also earmarked for agents-manager-reconciliation in _log/2026-07-26 DEEPENED-PLAN — owner assigns the final canonical number at ratification. Canonical ADR home is docs/architecture/ADR/ (currently at 0008); this draft lives in the kernel home per owner direction and promotes on ratification."
Related:
  - ../../01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md   # read/write-plane foundation (the seam this ADR seals)
  - ../../../../council/raw/2026-07-31-preroot-R3-root-scope-db.md            # 8 seams · 4 debts · DL-15 resolution
  - ../../../../council/raw/2026-07-31-preroot-R4-true-root-frame.md          # root-vs-tenant discriminator · gates · 5-fork run
  - ../../../../council/raw/2026-07-31-preroot-R1-premortem.md
  - ../../../../council/raw/2026-07-31-preroot-R2-sequencing.md
  - ../../../../03-projects/ga-rentacar/specs/07-durable-storeport.spec.md    # S7 durable-store spec (stub → this ADR is its home decision)
  - ./INDEX.md                                                                # kernel canon (terminology · invariants · axes-and-time)
  - ../../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md               # log=write-model, graph=projection (the axis this seals)
  - ../../../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - packages/engine/src/engine.ts                                            # ground truth: write()/admit/CQRS refresh
  - packages/engine/src/ports/store-port.ts                                  # ground truth: the StorePort seam (sync today)
  - packages/engine/src/adapters/store-md.ts                                 # ground truth: async @ff/core bridge, writeAct NOT wired to Engine.write
---

# ADR-DRAFT — Root scope + durable StorePort + integrity-as-engine-duty

> ⚠️ DRAFT/proposed. Paper phase — no code/git/package touched. Do NOT ratify until the owner has
> answered the ⏳ gate questions (bottom). Fully reversible by `Status: superseded` + redirect (LOSE-NOTHING).
> Grounded against the REAL engine code (commit `2c8d177`, 44/44 green), not against prose.

> ### ✅ UPDATE 2026-08-04 — S7 SEALED in code; OQ-1 / gate-Q4 resolved
> **S7 (§2 seam S7, table row S7 = `[N]`) is NO LONGER a gap.** `DurableFsStore` is built, tested across a
> real OS-process boundary, and sealed: `packages/engine/src/adapters/store-durable-fs.ts`; commit
> `b881212 seal GAP 1 — durable StorePort` (ancestor of HEAD); tests `packages/engine/test/survive-turn.test.ts`
> + `durable-reboot-matrix.test.ts`. **§4 decision-node / gate-Q4 RESOLVED in code = Option A (sync + durable
> fs).** Every S7 status mark below (`[N]`, «spec-07 stub — the key gap», «durability absent/physically absent»,
> «evaporates at turn end») is now STALE — read S7 as `[E] sealed`. What remains is the S7 **TAIL** (R1 wire into
> runner · R2 file-first pen · R3 crash-mid-turn · R4 batch-idempotency · R5 journal home · R6 retention) — see
> `docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md` and `../durable-storeport.design.md` §8.
> This banner corrects **only** the S7 / OQ-1(sync-async) status. The other seams (S5-one-home,
> S8-append-only-forward) and gate-questions 1/2/3/5/6/7 stand as written; do NOT read them as sealed here.

> ### ⚠️ Verification pass (W2, code-adversarial 2026-07-31) — claims below are CORRECTED
> An adversarial verifier ran the tests and grepped the engine. Four corrections override the optimistic
> framing in this draft (full detail: `council/raw/2026-07-31-preroot-W2-verify-reframe.md`):
> 1. **«6/8» завышено на пункт.** 44/44 зелёные, но в ОДНОМ процессе — нет теста через границу ОС-процесса
>    (тот же false-green класс, что M2). Durable-store не «частично сделан», а **физически отсутствует** в
>    реальном write-пути: `Engine.write → MemoryStore.writeAct` (RAM); дисковый `store-md.ts` даже не
>    соответствует sync-сигнатуре `StorePort` → не подставим в `Engine`. specs/07 = стаб.
> 2. **«Петля ложная» — недоказано, а не факт.** «durable-store переживёт без фикса шлюза» — это утверждение
>    о НЕПОСТРОЕННОМ компоненте. Верно как ДИЗАЙН, но должно быть ДОКАЗАНО тестом через реальный рестарт
>    процесса (AC-2), а не заявлено.
> 3. **Граница корень↔жилец УЖЕ пробита в коде.** `DEFAULT_PREDICATES` (`packages/engine/src/core/predicates.ts`)
>    хардкодит доменные имена (`rented`/`for-car`/`for-customer`) прямо в ядре; `foldInto` без инъекции
>    registry → второй жилец с новым предикатом ОБЯЗАН править файл движка. Нарушает DL-01 и гейт G2
>    («второй жилец = ноль правок движка») **сегодня**. Это скрытый второй breaking-контракт того же класса,
>    что sync/async.
> 4. **Три «уже-корень» инварианта НЕ enforced.** `same-as` не зарегистрирован (падает под `many` случайно,
>    не заперт тестом); append-only-forward ничем не защищён (смена registry молча переигрывает историю при
>    rebuild — мина A-C2 живая); one-home барьер платежа в `admission.ts` отсутствует (только комментарий).
>
> **Следствие для «печати корня»:** запечатывание = НЕ ещё один дизайн-проход, а перевод этих 4 пунктов в
> тесты, КРАСНЫЕ сегодня, и доведение их до зелёного. Это делает «готов» конечным и проверяемым кодом.

## Context

The owner's working direction: the FF root is not a fresh build — it is **~6/8 already standing** (`@ff/engine`
CQRS core: `write → fold → node`, `rebuild`, write-idempotency, admission, resolve-PEP, constitution-ceiling).
"Root build" = **seal the already-built seam** so that (a) the first tenant cannot corrupt it and (b) a second,
dissimilar tenant plugs in by registry-data alone. Three abstract-thinker passes (D1/D2/D3) plus four pre-root
council passes (R1–R4) converged on one structural fact:

> **The true root of FF is an engine-held CQRS seam** — exactly ONE append-only truth, arbitrarily many
> computed readings over it, and the ENGINE (not the lens author) holds the wall between "what is" (write,
> one home, immutable) and "how it reads / is policed / is acted on" (read, many lenses).

The `prefer-properties-over-poles` + `read = both-and / write = one-home` invariant (fork-discipline ADR-draft)
is therefore **not policy layered on top of the engine — it is already the topology of the root**. This ADR
fixes the root's outline (8 seams), names the 3 remaining seams as contracts, turns integrity into 4 enforced
engine debts, resolves the DB fork, and seals the root/tenant boundary with a discriminator + two hard gates.

**Root test used throughout** (R4 §0): X is root iff *(bottom)* removing X collapses everything AND *(top)*
adding above X does not change X. If X can be **swapped and the system survives, X is a floor, not the root.**

## Decision

### 1. Root outline — 8 seams (S1–S8)

Each seam = one module boundary / contract. Status against real code: `[E]` present · `[P]` partial · `[N]` gap.

| # | Seam | Contract it carries | Plane | Status |
|---|------|--------------------|-------|--------|
| S1 | **Journal (write-model)** | append-only act-log = system-of-record; one writer per path (`Engine.write → store.writeAct`); bitemporal fields on the act (`recordedAt` engine-assigned+immutable · `validFrom/To` opt) | write | `[P]` API present, **durability absent** |
| S2 | **Fold / projection (read-model)** | `write → node` fold; `rebuild('journal'\|'files')`; projection is DERIVED, never a second source of truth (ADR-0008) | read⟂write seam | `[E]` |
| S3 | **Envelope / passport** | thin passport (cheap to scan) ⟂ payload (rarely opened); edge = citizen with its own thin passport; provenance slot on the edge | data | `[E]` |
| S4 | **Read-time lenses + resolve-PEP** | "both-and" lives HERE (Form #1 dimmer: many lenses over one truth); `resolve()` = the only visibility path, default-deny, clamped by the constitution | read | `[E]` |
| S5 | **Admission-gate (integrity-as-engine-duty)** | fail-closed on inline-PII; **one-home barrier** (reject a second home-node for the same fact); scope-barrier; refuse-to-start | write | `[P]` PII/refuse present; **one-home absent** |
| S6 | **Registries policy-as-data + Constitution** | constitution-node = ceiling; cascade Constitution > policy > integrity; registries `node-type / edge-type / predicate+cardinality / view-def` = DATA (growth = INSERT) | control | `[E]` predicate+cardinality present |
| S7 | **Durable StorePort (survive-turn)** | durable append-on-write + rebuild-on-boot; next turn/process sees the act; re-ingest never clobbers `observation` | write/infra | `[N]` **spec-07 stub — the key gap** |
| S8 | **Level/autonomy as READING + append-only-forward** | level = traverse (provenance depth + reach), NOT type/folder; autonomy = valve at L3; `append-only-forward` (a rule NARROWS the future, never rewrites the past projection) | read + [HARD] | `[N]` designed, no reading in code |

**Minimality:** S1–S6 already stand → the root is ALREADY "substrate + constitution", not "storage + later".
The owner's hypothesis holds almost whole. Reaching the walking-skeleton = **S7 (durable) + S5-one-home +
S8-append-only-forward**. Everything else is a data INSERT.

**Load-bearing structural fact:** "both-and" is physically split across the CQRS seam S2. The write-plane
(S1/S5/S7) is one-home; the read-plane (S2/S4) is many-lens. The fork-discipline invariant is not a policy on
top — it is the root's topology. **The engine holds the wall (S5+S2); the lens author does not.**

### 2. The 3 remaining seams as contracts (not code)

#### S7 — Durable StorePort (survive-turn)

**Problem (real code):** `Engine.write()` (engine.ts:70–95) calls `store.writeAct` on the injected `StorePort`.
Today that store is a **sync in-RAM `MemoryStore`**. `store-md`/`MdEnvelopeStore` is an **async `@ff/core`
bridge whose `writeAct` is NOT wired to `Engine.write()`** — it only hydrates a `MemoryStore` from disk at boot.
Consequence: an act written during a turn **evaporates at turn end** → the live topic-agent (M3/T4) is
impossible by construction.

**Contract:**
- **C-S7.1 durable append-on-write.** `Engine.write() → store.writeAct(act)` appends the act to disk **at write
  time**; the next turn's rehydrate sees it.
- **C-S7.2 rebuild-from-journal on boot.** Process start reads the disk journal → folds the projection (proven,
  ADR-0008 §2). Boot may be async (it precedes serving) — see the sync/async decision-node (§4).
- **C-S7.3 idempotent re-ingest preserves observations.** A Sheets re-sync (`domain_event`) does not touch
  non-projectable `observation` acts.
- **C-S7.4 persistent node model fixed by ADR.** `EnvelopeNode ↔ FFNode` reconciliation (today the envelope
  rides as an opaque JSON blob in an `@ff/core` note) is gated by the node-model ADR (P3), not this one.

#### S5-one-home — Admission one-home barrier

**Today:** admission dedups by `source_ref + snapshotHash` (engine.ts:81–88) and rejects inline-PII. It does
**not** reject a second home-node for the same fact in a *different* domain.

**Contract:**
- **C-S5.1 one-home barrier.** Admission REFUSES an act that would create a second writer-home for a fact that
  already has a home (domain-barrier), regardless of storage backend. "Both-and" is admissible only as
  *one writer, many readers* — never *many homes, one fact*.
- **C-S5.2 payment-home lock (tenant expression of the mechanism).** The *mechanism* is root; the concrete
  home (`rental-balance` is the sole writer of a customer payment) is tenant registry-data.

#### S8-append-only-forward — Level-as-reading + monotone fold

**Contract:**
- **C-S8.1 append-only-forward fold.** A late-registered rule (e.g. `same-as cardinality='one'`) may NARROW
  future behaviour but MUST NOT retroactively rewrite the past projection via `rebuild-from-journal`. The fold
  is forward-monotone. (Cures mine A-C2: a late `same-as` would otherwise replay-rewrite the whole un-merge
  history.)
- **C-S8.2 level = computed reading.** Level is a traverse over provenance depth + reach, not a node type or a
  folder. The engine must eventually READ level; until then it is "a mark in the author's head" (gap D1-G1) and
  the ladder rests on author discipline — this is fast-follow, NOT a root blocker, PROVIDED the wall (C-S8.1 +
  `same-as` lock) is sealed.

### 3. Four engine debts = root acceptance-tests

integrity-as-engine-duty is made concrete as **4 enforced obligations** — otherwise honesty rests on author
discipline. Each is a root acceptance-test, not a guideline:

1. **One-home barrier (S5).** Admission rejects a second home-node for the same fact in another domain (closes
   critiques B-1/B-3/B-6). Today: dedup exists, cross-domain rejection does not → **debt**.
2. **Read-path carries meta + tombstone (S2/S4).** The inverse index today drops `meta`, so the access-plane
   loses the level/tombstone marker (C-CROSSTURN, D5). Level-as-reading (S8) is impossible until the read
   carries the marker → **engine debt**.
3. **`rebuild-from-journal` is append-only-forward (S2/S8).** Replay today walks all acts flatly → mine A-C2 →
   **[HARD]** engine duty, not data.
4. **Constitution is unwritable by data (S5/S6).** A rule-node may not claim Constitution-scope (admission
   test); memory may write L2–L4 policy but NOT the invariants; the valve on any irreversible action is `[HARD]`.

These four turn the fork-discipline invariant from paper into engine topology.

### 4. Decision-node — StorePort sync vs async ⏳

> **This is a one-way door.** Making `StorePort` async makes `Engine.write()` return `Promise<Ack>`, which
> **irreversibly flows into every write call site** (ingest-rentacar, rental-balance, cli, all future tenants).
> It cannot be undone once shipped. Recorded explicitly so the owner decides, not the builder.

**Current reality:** `StorePort` is **sync** (`writeAct(act): Act`, `load(): EnvelopeNode[]`). `Engine.write()`
is sync. `store-md` is async and used only as a boot-time bridge (hydrate a sync MemoryStore from disk).

| Option | What it is | Reversibility | Blast radius |
|--------|-----------|---------------|--------------|
| **A — keep write sync, durable via sync fs append** (★ recommended) | `writeAct` appends to the journal file synchronously (`appendFileSync`); boot-rebuild stays async and isolated (before serving) | write seam stays as-is; DB/adapter swappable behind port (floor) | zero call-site churn; 44/44 unaffected |
| **B — make StorePort async, `write(): Promise<Ack>`** | full async I/O on the hot write path | **one-way door** — `await` ripples to every current+future writer | high; touches every tenant, permanently |

**Recommendation (⏳ owner ratifies): Option A.** Seal `write()` sync at the root; durable append uses
synchronous fs; boot-rebuild is allowed to be async because it is isolated (precedes serving) and touches no
call site. Rationale:
- The sync↔async choice is a **floor property behind StorePort** IF write stays sync; going async is the *only*
  irreversible edge, so keep it out of the root until a **measured** concurrency need (a real multi-writer
  server) exists (fork-discipline Form #2: name the migration debt explicitly, don't pre-pay it).
- spec-07 §5: under short, supervised-solo turns contention is low; a single-writer file-lock formalises later.
- Consequence accepted: sync fs briefly blocks the event loop — fine for CLI / single-topic turns; NOT for a
  high-concurrency server. If/when that server is real, Option B is a deliberate, measured, one-way migration —
  not a default that "quietly flows in".

### 5. DB fork resolution (DL-15 ↔ DL-21)

**Contradiction to clear honestly:** DL-15 (2026-07-12) = "open, leaning graph". DL-21 (2026-07-18) =
"**DB = PostgreSQL, closes DL-15**" — ratified in a package. By source-of-truth Rule-2 (later ratified beats
earlier) **DL-15 is already closed = Postgres.** The R3 framing re-opened it; this must be explicitly
re-confirmed, not left dangling.

**Resolution (proposal to owner):** *"Postgres-default behind StorePort; the kernel is DB-agnostic; graph-native
is a FUTURE, MEASURED, additive adapter."* Three grounds:
1. The choice already hides behind the existing `StorePort` (its own comment: "swap to PG at M4 = ADDITIVE
   adapter, never a core edit"). While the read-model is folded in app code (S2/S4 — as it is today), the DB is
   just an act-store + KV and is fully reversible.
2. Graph-native becomes *irreversible* only if its traversal semantics (Cypher etc.) enter the view-compiler as
   a read-contract (Form #3: a vocabulary many read). **Do not let it.** Keep traversal in
   `edge-index.ts`/`view-compiler.ts` (app) → the DB stays swappable.
3. "Graph because graphs are serious" is an aesthetic choice, not a measured one — exactly the anti-pattern
   fork-discipline forbids (pole instead of property).

**The DB is a floor, not the root** (R4: swappable → floor). The real root blockers are the three DB-independent
one-home decisions (identity-ladder · predicate · payment-home) = the fork-discipline gates. **Do not let the DB
choice masquerade as a root blocker.**

### 6. Sealing the root boundary

**Root-vs-tenant discriminator (R4 §5, one line):**
> A requirement is ROOT ⟺ it is true for the 2nd/3rd/Nth tenant too (invariant to a domain swap).
> A requirement is TENANT ⟺ it is expressed as a **TYPE / PREDICATE / POLICY** (registry data) and dies when
> "car rental" is swapped for "health"/"calendar".

Two hard gates make the seal enforceable:
- **G1 — domain-noun-free kernel tests.** No ga-rentacar noun (car/rental/customer/payment/Emirates-ID) may
  appear in an engine spec or test (as anything other than seed-data). Antibody already exists: the kernel
  `vertical-scenario.spec.md` ("10-step proof without special tables"). Make it a hard gate.
- **G2 — second-tenant-zero-engine-edits.** A second, dissimilar tenant (calendar/health) plugs in by adding
  registry-data ONLY (types/predicates/policy), ZERO engine edits, and the first tenant's truth is provably
  un-corruptible (`append-only-forward` + `same-as cardinality='many'` locked). Bar = "second tenant without
  engine edits".

**5 ga-rentacar forks run through the discriminator:**

| Fork | Class | Why |
|------|-------|-----|
| payment one-home / single writer | **ROOT** | any tenant with facts/money needs it |
| `same-as cardinality='many'` + `append-only-forward` (A-C2) | **ROOT** | identity resolution is universal; else tenant #1 retro-corrupts truth |
| lens does not reach orders (read completeness) | **ROOT** | any tenant needs a lens that reaches the end |
| cross-turn persistence / rebuild actually writes (S7) | **ROOT (not built)** | durability of truth is universal — the gap the first tenant forces |
| level is read (not a tag) + rollup/promotion contract | **ROOT (not built)** | else every tenant re-invents merge (D1-G1) — fast-follow if the wall is sealed |
| predicate `rented` vs `for-customer` · namespace `Payment#` · Sheets-upstream · Emirates-ID/PII · `phone∧name` | **TENANT** | domain vocabulary = DATA in the registry, NOT the engine |

**Capture signal:** the moment a ga-rentacar noun appears in an engine spec/test (not as seed-data), the tenant
is capturing the root — G1 rejects it.

## Alternatives considered

- **Restart the root ("build the kernel properly").** Rejected: R3/R4 verified against real code — S1–S6 already
  stand (CQRS core, admission, resolve-PEP, constitution-refuse). A restart discards 44/44 green work and the
  proven seam. Seal, don't restart.
- **Freeze the DB (graph-native) into the root.** Rejected: a swappable thing is a floor (R4). Freezing graph
  semantics into the view-compiler would make the DB irreversible (Form #3). Keep it an additive, measured adapter.
- **Make StorePort async by default now.** Rejected as a *default* (kept as an owner-gated one-way door, §4):
  irreversibly ripples `await` into every writer with no measured concurrency need.
- **Level as a node TYPE / FOLDER (a graph floor per abstraction level).** Rejected (D1): cuts the graph, breaks
  the single substrate. Level = a READING of the graph (provenance depth + reach), not a partition.
- **Global "both-and" everywhere / global "either-or" everywhere.** Rejected (fork-discipline): the first breeds
  a second write-truth; the second kills per-brain sovereignty. The seam is the boundary.

## Consequences

(+) One durable, engine-held seam that the first tenant cannot corrupt and a second plugs into by data alone.
(+) The fork-discipline invariant becomes enforced topology (4 acceptance-tests), not author discipline.
(+) DL-15/DL-21 contradiction cleared; the DB stops masquerading as a root blocker.
(+) The root/tenant boundary is testable (G1 domain-noun-free + G2 second-tenant-zero-edits).
(−) S7 durable-store + one-home barrier + append-only-forward fold are real build work before "root sealed".
(−) The sync/async door must be decided now to avoid it "quietly flowing in" later (§4 ⏳).
(−) Level-as-reading + rollup contract stay fast-follow (not root) — safe ONLY if `append-only-forward` +
   `same-as='many'` are locked in the root; otherwise tenant #1 corrupts truth.
(−) Naming/number/home: canonical ADRs live in `docs/architecture/ADR/` (at 0008); this draft lives in the
   kernel home and pre-claims 0009, which is also earmarked for agents-manager-reconciliation — owner assigns
   the final number and home at ratification (reversible, LOSE-NOTHING).

## Validation plan (acceptance = root sealed)

- **AC-S7 durable.** `Engine.write(act)` with a disk-`StorePort` appends synchronously; a NEW OS process boots
  from disk and reads the act the previous process wrote (closes the missing durable-`writeAct` test, spec-07 AC-2).
- **AC-S7 re-ingest.** A `domain_event` re-ingest does not erase `observation` acts (T4 holds, spec-07 AC-3).
- **AC-debt-1 one-home.** Admission rejects a second home-node for the same fact in another domain.
- **AC-debt-2 read carries meta.** The inverse index preserves `meta`+tombstone; the access-plane reads the
  level/tombstone marker.
- **AC-debt-3 forward-monotone.** `same-as cardinality='many'` (never `'one'`); a late rule does NOT rewrite the
  un-merge history on `rebuild-from-journal` (`append-only-forward`).
- **AC-debt-4 constitution.** A rule-node claiming Constitution-scope is refused by admission.
- **AC-G1 domain-noun-free.** No ga-rentacar noun in an engine spec/test (lint/review gate).
- **AC-G2 second tenant.** A calendar/health tenant plugs in by registry-data only, zero engine edits.

## Rollback

Fully reversible by status — this is paper (design phase). Rollback = `Status: superseded` + redirect stub to
the superseding ADR; nothing deleted (LOSE-NOTHING). This record touches no code.

## ⏳ Open questions to owner (gate before ratification)

1. **[framing · P0]** Accept: the true root = an engine-held CQRS seam (one append-only truth ↔ many computed
   readings, the engine holds the wall); "substrate / constitution / DB / persistence" = body / fence / floor /
   property — NOT four equal parts of the root? (Follows: DB and ladders leave the "must-not-miss-before-root" list.)
2. **[scope · P0]** The root walking-skeleton INCLUDES durable StorePort (S7, survive-turn) as a mandatory seam
   — i.e. the root is "a substrate that survives a gateway turn", not "storage + bolt-on later"?
3. **[decision · P0]** Ratify integrity-as-engine-duty as the 4 enforced obligations (§3) → they become root
   acceptance-tests, not discipline?
4. **[decision · P0]** StorePort sync vs async (§4): accept the recommendation — seal `write()` sync now, durable
   append via sync fs, defer async to a measured concurrency need as a deliberate one-way migration? (One-way door.)
5. **[decision · P0]** Close DL-15 as "Postgres-default behind StorePort; kernel DB-agnostic; graph-native = a
   future measured additive adapter" (re-confirming DL-21, which R3-framing re-opened)?
6. **[boundary · P1]** Ratify the root-vs-tenant discriminator + gates G1 (domain-noun-free kernel tests) and G2
   (second-tenant-zero-engine-edits) as the definition of "root sealed"?
7. **[boundary · P1]** Lock the dependency direction (import-lint): `core`/`engine` carry NO project vocabulary;
   all rental terms live only in `ingest-rentacar`/`rental-balance` (already true) — ratify as an enforced border?
