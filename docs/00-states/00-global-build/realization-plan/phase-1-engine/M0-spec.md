---
id: M0-spec
node_type: spec
title: "M0 — Real, CI-gated ff-engine core package (thin vertical, seam-freeze)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-26
scope: project
lens: spec / architecture
related:
  - ./README.md                                                                                   # Фаза-1 движок: Hexagonal+CQRS, порты/адаптеры, resolve() PEP, карта модулей, DoD, риски
  - ./vertical-scenario.spec.md                                                                    # 10-шаговый вертикальный proof (контракт сценария)
  - ../../../../_log/2026-07-26-ff-one-system-vision/02-SYNTHESIS-vector-selection.md              # V2★: M0 = real CI-gated engine, holes fixed, resolve()=PEP day-1, seams frozen
  - ../../../../_log/2026-07-26-ff-one-system-vision/agents/critique-V1.md                         # точная формулировка двух дыр + «narrative .mjs ≠ package»
  - ../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md        # resolve() = clamp(fold(...)); мета-cap-гейт; deny=clamp
  - ../../../../architecture/ADR/ADR-0006-persistence-as-policy.md                                 # хранение = политика-на-тип (PG-default + file-first opt-in) — G2
  - ../../../../architecture/ADR/ADR-0007-erasure-and-admission.md                                 # §Minimal day-1 rule (approved): no-inline-PII + admission-gate — G3
  - ../../../../02-project/core/00-kernel/invariants.md                                            # I-1..I-14 + «7 тестов ядра»
  - ../../../../02-project/core/02-agents/examples/01-agent-manager/_generated-examples/run-view.mjs        # seed A (depth-1)
  - ../../../../02-project/core/02-agents/examples/01-agent-manager/_generated-examples/run-view-depth2.mjs  # seed B (loop-guard + subtree-delta)
  - ../../../../02-project/core/02-agents/examples/01-agent-manager/_generated-examples/run-capability.mjs   # seed C (NAIVE/FIXED resolver, 15 сценариев)
  - packages/core/package.json                                                                     # эталон дисциплины (vitest, tsc, npm workspace `@ff/core`)
---

# M0 — Real, CI-gated ff-engine core package

> **Phase = DESIGN.** Это спек, а не код. Он фиксирует контракт milestone **M0** из синтеза V2★
> (`02-SYNTHESIS-vector-selection.md`, §2 🛠 M0) в исполнимом виде: что портируется, какие функции
> экспортируются, какие тесты гейтят CI, какие швы замораживаются, и что явно ВНЕ M0. Никакого «строй»
> здесь нет — это ground для следующего хода (builder), когда владелец скажет строить.

---

## §0. Проблема / зачем M0 существует

Синтез V2★ выбрал «тонкий живой вертикал на расчищенной воротами земле». Его **самая первая веха** —
не фича, а **инженерная честность**: превратить «доказанные seed-скрипты» в **настоящий, CI-гейтный,
импортируемый пакет ядра**. Причины (проверены на диске 2026-07-26):

1. **`TOOLS/ff-engine` НЕ существует.** `ls TOOLS/` → `agents-manager · am-merge · am-pkg1 · am-pkg2 ·
   telegram`. Никакого `ff-engine`.
2. **«Доказанные seed'ы» — это narrative `.mjs` в дереве документов**
   (`docs/02-project/core/02-agents/examples/01-agent-manager/_generated-examples/`), 199–409 строк,
   с top-level `process.exit`, не в пакете, не в CI, не под тест-раннером.
3. **Единственный настоящий, собираемый, тестируемый код — `packages/core` (`@ff/core`)**: 649 строк,
   14 vitest-тестов, npm-workspace, `tsc`+`vitest`. Он реализует files-as-graph store + context cascade +
   levels + traces. У него **нет** `resolve()`, LSR, capability-слоя — это более ранняя, более мелкая
   итерация ядра. Но это **эталон дисциплины**, которую M0 обязан повторить.
4. **Число «15/15» надо сделать реальным.** Критик-пасс (`critic-verify-killer-test.md`, 2026-07-24) на
   более ранней версии нашёл 13/13 с переоценкой: dead-code мета-гейт + живая утечка id.

> **Честная сверка на 2026-07-26 (важно для scope M0):** текущий `run-capability.mjs` (перезаписан
> 2026-07-24 23:29, ПОСЛЕ критик-пасса) уже даёт **FIXED 15/15** — в него ДОБАВЛЕНЫ S11 (forge-access,
> мета-гейт `core:manage-access` теперь ВЫЗЫВАЕТСЯ из write-path) и S12 (tree-topology, id секрет-узла
> теперь ВЫРЕЗАЕТСЯ из дерева, а не обнуляется). Прогон подтверждён: `NAIVE 3/15 | FIXED 15/15`.
> **Следствие для M0:** обе дыры уже закрыты В СКРИПТЕ, но доказательство неверифицируемо (docs-tree
> `.mjs`, вне CI, на том же синтетик-корпусе, что раньше прятал дыры). **Работа M0 — не переоткрыть
> фикс, а сделать число реальным и защитить его регрессионными red→green тестами в CI**, чтобы фикс не
> «отвалился молча» при портировании.

**Falsifiable exit-claim M0:** после M0 можно указать на **зелёный CI-прогон** (`npm test` в workspace),
в котором (a) оба view-seed'а исполняются как импортируемые функции, (b) capability-killer даёт **15/15
FIXED** как настоящий тест-раннер-результат, (c) две дыры закрыты и заперты red→green регрессиями,
(d) `resolve()` — единственный путь видимости (нет обходного эмита), (e) admission-gate отказывает
инлайн-PII акту. Если хоть один пункт не зелёный — M0 не сдан.

---

## §1. Goal

Turn the narrative seeds (`run-view` + `run-view-depth2` + `run-capability`) into a **real, CI-gated,
importable ff-engine core package** whose core modules are **pure functions with no top-level
`process.exit`**, wired so that `resolve()` is the single Policy Enforcement Point (PEP) on the
visibility path **from day one** (no allow-all stub), with the two known capability holes fixed and
locked by regression tests, and with the ACT-envelope + admission-gate present so M1 rentacar ingest
is safe.

**Non-goal of M0:** production quality, scale, PG, HTTP, a second bot. M0 proves *contract + CI*, not
performance (see §8 OUT).

---

## §2. Home decision — recommend `packages/engine` (this repo), NOT `TOOLS/ff-engine`

> The README and the synthesis both write the literal path `TOOLS/ff-engine`. That name was inherited
> from V1/README **before the reality check**. As architect I recommend a different home, with reasoning,
> and flag it as an owner-confirmable naming call (reversible, R0).

**Recommendation: create `packages/engine` (`@ff/engine`) inside FF-Personal-Management**, next to the
existing `@ff/core`, reusing the already-ratified npm-workspace + `tsc` + `vitest` discipline.

| Criterion | `packages/engine` (recommended) | `TOOLS/ff-engine` (README literal) |
|---|---|---|
| **CI/test discipline** | Already exists: root `package.json` `workspaces:["packages/*"]`, `@ff/core` runs vitest+tsc. Zero setup — the "mirror `packages/core`" instruction becomes literal. | New repo/toolchain to stand up; duplicates the discipline that already exists here. |
| **Co-location with SoT** | Engine sits WITH the corpus (`nodes.json`), the ADRs (0004–0007), the kernel canon (`00-kernel/`) it is tightly coupled to during design. One repo = one knowledge SoT (V4 reframe adopted). | Splits engine from the corpus/ADRs/canon it consumes → cross-repo drift during the exact phase they co-evolve. |
| **What TOOLS/ is for** | — | TOOLS/ holds **cross-project runtime tooling** (agents-manager gateway, telegram). The engine is **this project's domain core**, not a shared runtime tool. |
| **Shared consumption by agents-manager** | Satisfied by **package dependency** (npm workspace link / published `@ff/engine`) at M3 — location of source ≠ ability to depend. The V4 cut is: knowledge→engine (library), ops→gateway (local). agents-manager imports the engine; it need not host it. | The only real argument FOR TOOLS/ ("общий brain+agents") — but co-hosting is not required for sharing; a library is shared by dependency, not by directory. |
| **Relationship to `@ff/core`** | Decide explicitly (see below) — but both live in one workspace, so absorption/dependency is a local refactor, not a cross-repo migration. | `@ff/core` (this repo) and `ff-engine` (TOOLS/) would be two node-graph kernels in two repos — the "two engines" smell the whole vision fights. |

**`@ff/core` relationship (decide at M0):** `@ff/core` already implements a files-as-graph **store** +
context cascade + levels + traces. That overlaps `StorePort`/`store-md`. **Recommended:** `@ff/engine`
**depends on** `@ff/core` for the file/store substrate and adds the fixed engine domain (`validate ·
index · compile · resolve`) on top; do **not** fork a second store. If `@ff/core`'s shape doesn't fit
the `StorePort` contract cleanly, adapt it behind the port — that is exactly what the port is for. (Deep
fit-analysis of `@ff/core` → `StorePort` is an M0 sub-task for the builder/analyst; this spec only fixes
the direction: reuse, don't fork.)

**Owner-confirmable:** if the owner wants the literal `TOOLS/ff-engine` (e.g. to publish the engine as a
standalone product early), that overrides this recommendation; then update README §🧱 accordingly. Absent
that, M0 builds `packages/engine` and the README path is corrected to match.

---

## §3. Scope IN — what M0 builds

### 3.1 Port BOTH view-seeds into pure core modules

Split the monolith seeds by stage into **importable pure functions** (no I/O, no top-level `process.exit`
— exit lives ONLY in `surface/cli`, per README F1-fix / ADR-0004 Consequences #3):

| Core module | Ported from | Pure fn (exported) | Contract |
|---|---|---|---|
| `core/loader.ts` | seed `byId` build | `load(store): {nodes, byId}` | from `StorePort` → in-memory graph |
| `core/envelope-validator.ts` | `run-view.validate()` | `validate(graph): Problem[]` | конверт (10 полей) · рёбра-пары в `meta:pred` · тип в `meta:type` · meta-example (R-3). **fail-closed по поведению** |
| `core/edge-index.ts` | `reverse`/`inverseSources` | `buildIndex(graph): {inverseSources(t,pred)}` | inverse edges COMPUTED, one side stored (DEC-12) |
| `core/view-compiler.ts` | `matchFilter`/`costTree`/`runVisibleTo`/`runActionsByAgent` | `compile(viewDef): (graph,ctx)=>Result` | ONE generic 4 stages `from·traverse·filter·shape` (R-1) |
| `core/resolve.ts` | `run-capability` FIXED engine | `resolve(key,viewer,node,graph): allow\|deny` | ★ PEP: `clamp(fold(combinator, orderedStack))` (ADR-0004) |
| `core/types.ts` | — | `Node · Edge · ViewDef · Decision · SubjectRef · GraphContext · Problem` | shared types |

**From seed B (`run-view-depth2.mjs`) — MUST port, do not lose:**
- **loop-guard** (visited-set on `loop-run` traversal), and
- **subtree-delta** (Q-10 = subtree rollup semantics).

These are separately-proven mechanisms; the README explicitly forbids losing them. Porting only seed A
(depth-1) is an M0 failure.

> **Iterative, not recursive** for the tree walk: `cost-tree` over `delegates-to` MUST use an iterative
> traversal with a `visited` set + `policy.max_delegation_depth` (README DoD; loop-guard of a `loop-run`
> does NOT protect a static tree walk). The seed's `costTree` recursion is replaced by an iterative walk
> in the port.

### 3.2 `resolve()` PEP wired into the view-filter path — day one, no bypass

- `view-compiler`'s `filter` stage, when it encounters `{visible_to: $viewer}`, calls
  `resolve(key, viewer, node, graph)` as **the** filter — exactly as `run-capability.mjs` routes
  `costTree` and `visibleTo` through the same `resolveRead`. There is **no** allow-all path and **no**
  second visibility check anywhere else (I-7: single PEP).
- **Write-path** also routes through `resolve()` (write key), and the **meta-cap gate**
  (`core:manage-access` / `manage-grants` / `manage-core`) runs BEFORE `resolve` on the write path
  (ADR-0004 D4). This is the seed-C FIXED engine, ported verbatim in behaviour.
- The combinator/order comes from **data** (node `policy:access-priority`), not a hardcoded branch
  (ADR-0004 Appendix A); `deny`-floor and Constitution-ceiling are **clamps after the fold**, not stack
  layers (I-8).

### 3.3 Invariants + capability tests in CI (vitest)

Two test files, run by `vitest run` under the workspace, gated in CI next to `concept-lint`:

- **`test/invariants.test.ts`** — envelope/edge-pair/meta-example validator asserted **fail-closed by
  behaviour** (refuse-before-compute, not just exit-code, per risk R-5): assert that on an invalid node
  the compiler REFUSES to compute the lens (throws / returns refusal), it does not "print then exit 1".
  Plus the three proven lenses (`cost-tree`/`visible-to`/`actions-by-agent`) return the expected shapes
  on the seed corpus.
- **`test/capability.test.ts`** — the 12 attack + 3 legit scenarios (S1–S12, L1–L3) as real assertions:
  `expect(NAIVE breach).toBe(allow)` and `expect(FIXED).toBe(expected)` for each, yielding the real
  **NAIVE 3/15 | FIXED 15/15** as a CI number, not a doc claim. (See §4 for the two hole-locking tests
  called out explicitly.)

### 3.4 ACT-envelope + admission-gate present (for M1 safety)

Even though M0 storage is in-memory/md (§5), the **write contract** M1 will use must exist and be
enforceable now:

- **ACT-envelope shape** (frozen at M0, from G1/CQRS): an act carries `id · actor · provenance ·
  recordedAt · act-kind · edges · payloadRef · payloadHash` (ADR-0007 (a)). ActKind ∈
  `domain_event · observation · command · access_event · agent_trace · system_telemetry`.
- **`admission-gate` (no-inline-PII)** — a pure predicate `admit(act): ok | refuse(reason)` that
  REFUSES an act whose payload inlines sensitive/PII content instead of carrying `payloadRef`+`payloadHash`
  (ADR-0007 §Minimal day-1 rule, **approved** as gate G3). This is the validator check ADR-0007 (e.1) /
  Validation-plan #3. It is present and unit-tested at M0 so M1 rentacar ingest (Orders carry
  customer names/phones) is safe by construction.

---

## §4. The TWO capability holes as explicit acceptance tests (red→green)

> Ground truth (§0): the seed already fixes both at 15/15. M0's contract is to **lock** each as a
> regression pair — a **red** assertion (the breach reproduces under NAIVE / with the fix removed) and a
> **green** assertion (FIXED closes it) — so the fix cannot silently regress during the port. Each is a
> named acceptance test in `test/capability.test.ts`.

### Hole A — dead meta-cap-gate / the 13→15 gap (privilege escalation)

- **What it was:** `core:manage-access` gate was defined but **never invoked** — a writer with only
  `write-knowledge` could forge a permissive `access.can_read`/`visibility` field and grant itself
  reach. The killer had 13 scenarios; the forgery path (S11) and grant-mint path (S4/S10) were the gap.
- **Test A (`S11 forge-access-field`, + S4/S5/S10 minting/namespace):**
  - **red:** `resolveWrite("write", user:mallory, node, {field:"access.can_read"}, NAIVE)` → `allow`
    (breach reproduced — the gate is bypassable when not wired).
  - **green:** same call under `FIXED` → `deny`, because `resolveWrite` invokes
    `canWriteAccessFields → holdsCapability(viewer,"core:manage-access",…)` **on the write path**.
  - **mutation guard (locks "not dead code"):** a test that stubs the meta-gate to always-allow MUST
    flip S11 FIXED to `allow` — proving the gate is *load-bearing*, i.e. actually invoked. (This is the
    exact thing the critic pass could not assert on the docs `.mjs`.)

### Hole B — live visibility/topology leak (information disclosure)

- **What it was:** the FIXED `costTree` returned to an unauthorized viewer still **leaked the secret
  node's id** into the returned tree (the numeric value was zeroed but the id/edge remained — S3 numeric
  + S12 topology).
- **Test B (`S12 tree-topology-redaction`, + S3 numeric):**
  - **red:** `treeIds(costTree(root, agent:auditor, NAIVE))` **includes** `agent:explorer-secret`
    (id leaks) AND `ownCostGated(secret, auditor, NAIVE) > 0` (numeric leaks).
  - **green:** `treeIds(costTree(root, agent:auditor, FIXED))` **does NOT include**
    `agent:explorer-secret` (branch PRUNED, not zeroed) AND the numeric contribution is absent — because
    each snapshot AND each traversed edge is gated by `resolveRead` before it is emitted (I-7 on
    traversal).
  - **everywhere-clause (maps vertical-scenario step 8 / test deny-field-everywhere):** assert the denied
    field/node is absent from **(1) plain query (`visibleTo`) · (2) graph-traversal (`costTree`)**. Vector
    (3) and prompt (4) paths are OUT of M0 (stub/deferred); trace-leg (5) is explicitly NOT gated in
    Phase-1 (open question — `agent_trace` is a write stream, not a read-path under `resolve()`).

> These two tests are the **M0 exit criterion for capability** — not "invariants green on the same
> synthetic corpus that already hid two holes." 15/15 is the *headline*; Tests A and B are the *lock*.

---

## §5. Storage for M0 — in-memory / md corpus (PG deferred to M4)

- **`store-memory` + `store-md`** are the only adapters at M0. The seed corpus (`nodes.json` /
  `nodes-cap.json`, real graph-loop + capability overlay) is the M0 test corpus. This is fine per
  thin-vertical: PG is **M4** (`02-SYNTHESIS §2`), scale (Q-7) is M5+.
- **CQRS discipline is set now, exercised later:** md+journal = system-of-record (write-model);
  PG read-model is deferred but the code is written so the store swap is **additive** (a new adapter),
  never a core edit (ADR-0006 / G2). Carry `projectionId/version` + provenance from the start so M4 is a
  real correction point, not a mechanical swap (synthesis risk R3).
- **What MUST exist at M0 regardless of storage:** the ACT-envelope shape and the admission-gate (§3.4),
  because M1 writes real client PII and the gate must refuse inline-PII **before** the write reaches any
  append-only journal.

---

## §6. Seams to freeze at M0 — frozen contract vs extensible enum

Freeze **only the load-bearing seams** (synthesis invariant 5 / V4 S1·S3·S4 + acts-envelope). For each,
mark what is **frozen wire-contract** vs **extensible enum** (README §🔓 extensibility commandments —
declare the anchor vs the enum, else future extension is breaking, not additive).

| Seam | Frozen contract (anchor) | Extensible (enum / additive) | Rationale |
|---|---|---|---|
| **S1 · `StorePort`** | method set: `load() · readNode(id) · writeAct(act) · rebuild(from)`; return shapes | which concrete adapter (`memory·md·pg·…`); storage layout | store swap must be additive (ADR-0006) |
| **S1 · `EngineClient`** (surface-facing) | `view(def,ctx) · resolve(key,viewer,node) · write(act) · rebuild(from)` | new view-defs (data); new adapters | the one API agents-manager binds at M3 |
| **S2 · `SurfacePort` (CLI)** | command verbs are the anchor: `validate · view · resolve · load · rebuild[--from journal\|files] · write · bench`; exit-code lives ONLY here | flags/output-format; HTTP surface (deferred behind auth gate — R-1) | thinnest surface over core; HTTP is NOT frozen (it doesn't exist yet) |
| **S3 · `resolve()` PEP** (`IPermissionPolicy→resolve`) | signature `resolve(key,viewer,node,graph)→Decision`; `clamp-after-fold`; deny=clamp; meta-gate before write | the **combinator** (data: `policy:access-priority`); new clamps as data | single PEP, one policy model (ADR-0004) |
| **S4 · capability-node schema** | frozen fields: `grant{subject, in_scope, allow[], deny[], minted_by}` · `meta:cap/*{default, irreversible}` · glob/prefix match grammar | the **capability namespace** (`core:* · finance:* · vendor:*` — enum grows by data); new caps | caps are data; the *shape* is contract |
| **acts-envelope shape** | `id · actor · provenance · recordedAt · act-kind · edges · payloadRef · payloadHash` | **ActKind** is an extensible enum (6 kinds now); new domain fields go in payload, never top-level | from G1/CQRS + ADR-0007 (a); no inline PII |

> **Not frozen at M0 (deliberately):** the `from·traverse·filter·shape` view grammar's *aggregation set*
> (`sum/avg/count` = R1 enum value vs R3 new fold) — README leaves the R1/R3 boundary open; M0 ships only
> the proven lenses and does NOT freeze the aggregation enum as a wire-contract (vertical-scenario step-10
> is PROVISIONAL). Declaring this boundary is an owner/README item, not an M0 freeze.

---

## §7. Definition of Done (DoD) — falsifiable

- [ ] **CI green.** `npm test` in the workspace runs `test/invariants.test.ts` + `test/capability.test.ts`
      under `vitest run`; both pass; wired in CI next to `concept-lint`. `tsc --noEmit` clean.
- [ ] **Capability 15/15 REAL, not narrative.** `capability.test.ts` yields **NAIVE 3/15 | FIXED 15/15**
      as a test-runner result (mirrors the verified seed run), each scenario an assertion.
- [ ] **Both view-seeds ported.** `run-view` (depth-1: validate · inverse-index · cost-tree · visible-to ·
      actions-by-agent) AND `run-view-depth2` (loop-guard + subtree-delta) exist as pure importable fns;
      no top-level `process.exit` in any `core/*` (exit only in `surface/cli`).
- [ ] **Hole A locked (red→green + mutation guard):** S11 forge-access is `allow` under NAIVE, `deny`
      under FIXED; stubbing the meta-gate flips FIXED S11 to `allow` (proves the gate is invoked, not dead
      code).
- [ ] **Hole B locked (red→green):** `agent:explorer-secret` id is PRESENT in the NAIVE tree and ABSENT
      from the FIXED tree (pruned, not zeroed); numeric contribution absent under FIXED.
- [ ] **`resolve()` is the ONLY visibility path.** `visibleTo` and `costTree` both route through the one
      `resolveRead`; a test asserts there is no second/bypass visibility filter (I-7). No allow-all stub
      anywhere.
- [ ] **Admission-gate refuses inline-PII.** `admit(act)` REFUSES an act that inlines a PII field
      (fail-closed, before any journal write); passes an act carrying `payloadRef`+`payloadHash`
      (ADR-0007 Validation #3).
- [ ] **Fail-closed by behaviour.** On an invalid node the compiler refuses to compute the lens
      (refuse-before-compute), asserted by test — not "compute then exit 1" (risk R-5).
- [ ] **Seams frozen (§6)** as typed contracts (`ports/*.ts`, `types.ts`), with the frozen-vs-enum split
      documented in code comments referencing this spec.
- [ ] **Home decided** (§2): `packages/engine` created (or owner-confirmed `TOOLS/ff-engine`), `@ff/core`
      relationship set (depend, don't fork).

---

## §8. Explicitly OUT of M0 (thin means thin)

- **PostgreSQL** / any DB adapter (→ M4; CQRS read-model deferred, store-swap kept additive).
- **HTTP surface** (behind the viewer-auth gate — R-1; CLI only at M0).
- **Q-7 scale pass** (10³–10⁴ adversarial corpus, P95 thresholds) → M5+.
- **Roles / business-bot** (second token/users) → M4, and only after the partition-isolation killer-test.
- **Mini-app, CRM embed** → deferred behind the auth gate.
- **as-of / time-travel** lens (D-5): `recordedAt` real + full `rebuild --from journal` proven, but the
  as-of slice is post-MVP; not an M0 gate.
- **Vector / pgvector / semantic lens** (step 7): stub-embedder only, integration later.
- **New folds / aggregation enum freeze** (step-10 `sum(cost)` R1/R3 boundary) — owner/README item.
- **trace-leg of deny-field-everywhere** (`agent_trace` redaction) — open question, not gated in Phase-1.
- **memory-agent** beyond a projection-stub (step 6).

---

## §9. Acceptance = the vertical-scenario steps M0 actually enables

M0 does not run all 10 vertical steps, but it makes these **executable on the CLI over the seed corpus**
(the falsifiable "прогон" per `vertical-scenario.spec.md` §Acceptance):

- step 5 — `engine view cockpit --viewer user:jenya` → task visible (resolve() as filter).
- step 8 — `engine resolve <field> --viewer agent:crm --node <task-id>` → **deny** (field absent) — the
  flagship deny-field-everywhere, locked by Test B for query + traversal legs.
- step 10 — `engine bench cost-tree --root <agent-id> --depth 10000` → finite result, no stack overflow
  (iterative walk + cycle-guard) — the *finiteness* is in-scope; the `sum(cost)` R1/R3 question is not.

Steps 1–4 (create/relate/act/priority), 9 (rebuild-current), and explain-chain are exercised as
write-path + validator + rebuild unit tests. Steps 6/7 (memory/RAG) are stubs (OUT).

---

**Статус:** `draft` — контракт M0. НЕ создаёт код и НЕ ратифицирует. Предусловия старта (из синтеза): 🔒 G1
(FQ25/CQRS ратифицирован — фиксирует acts-envelope), 🔒 G5 (provisional-форки благословлены). G2 (ADR-0006
текст) и G3 (ADR-0007 minimal — **уже approved**) идут параллельно с M0 и обязательны до M1. Перед первой
строкой кода — явное «строй» владельца и подтверждение home-развилки (§2).
