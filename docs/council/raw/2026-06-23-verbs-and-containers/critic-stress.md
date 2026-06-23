# Critique — Verbs + Containers council (critic / red-team stress)

- **Role:** critic (adversarial lens — assumption audit, failure modes, contradiction detection, missing perspective)
- **Date:** 2026-06-23
- **Status:** raw (council input, not a decision)
- **Critiquing:** `abstract-verbs-wide.md` (abstract-thinker), `architect-containers-map.md` (system-architect)
- **Grounding:** ADR-0002 (ratified), THREAD N-057…N-069 (owner voice msg 240, N-069 quality bar)
- **Confidence marked per finding. Classification: SOUND / WEAK / BROKEN.**

---

## 0. Meta-check first (the owner's N-069 bar): did either agent mis-pose or quietly narrow?

The owner's own quality bar (N-069): *if the task is posed wrong, the result is poor; go wide and creative; bring agents to avoid mis-framing.* So before per-claim verdicts, the load-bearing meta-question: **did the two agents widen, or did they narrow under a familiar frame?**

- **Abstract-thinker: WIDENED, honestly.** It explicitly reframed G from "list 8 verbs" to "find the boundary between 3 layers," surfaced reactivity as a structural blind spot of CRUD, and flagged its own two doubts. This is the better answer to N-069. It does the wide pass the owner asked for.
- **Architect: NARROWED, subtly, under one frame — "protect the thin passport."** Every owner ask is run through one test ("is this load-bearing for the passport?") and the answer is almost always "no → route it to control-plane / engine / ADR-0003." This is internally consistent and defensible, BUT it is the **opposite** posture from N-069. N-069 said "go wide, the task may be posed wrong"; the architect's whole document is "the existing model already covers this; here is where each ask lands." **That is a containment posture, not a wide/creative one.** It may be correct — but it is exactly the move N-069 warned could produce a poor result by treating a wide question as a placement exercise. **This is finding #1 below and the single most important meta-defect.**

The two agents are in **latent tension**: abstract-thinker says "the verb contract is posed too narrowly and the real richness must live in an explicit, designed capability layer"; architect says "no new mechanism needed for most of it, it's already covered, keep everything thin." Both can't be fully right. The council has NOT reconciled this, and the team-lead summary should not pretend it has.

---

## 1. Per-claim verdicts

### Claim 1 (abstract) — 3-layer model "dissolves" the N-066 tension.
**Verdict: WEAK (relocates, not dissolves). Confidence: high.**

The reframe ("verbs are the engine surface, capabilities are control-plane data") is genuinely useful and is the right *direction*. But "dissolves the tension" is overclaiming. The N-066 tension was "8 fixed verbs ⟷ many per-skill capabilities." The 3-layer model does not remove that tension — it **moves it up one floor**, into the boundary question "which capability is a verb vs a lens vs a pattern vs a manifest?" That boundary is *exactly as hard* as the original question and the abstract-thinker admits as much in §4 ("G must DEFINE the boundary"). Defining a boundary is not dissolving a tension; it is naming where the tension now lives. The phrasing "dissolves" risks the council declaring victory on a problem that is merely relocated to the skill-manifest — which is itself undefined (see Claim 1b).

**Lens:** contradiction detection. The doc says "dissolves" in §0/§4 and "G must DEFINE the boundary" in §4/§5 — those are not the same claim.

### Claim 1b — "skill-manifest node" is a real solution.
**Verdict: WEAK → leaning BROKEN as currently specified. Confidence: medium-high.**

The skill-manifest is the load-bearing piece that absorbs "по-разному для каждого агента" (N-066's actual caveat). But it is described in one line: "узел: какие линзы/паттерны/типы/scope ему доступны + макрос-процедура." That is hand-waving in three ways:
1. **It silently re-imports the macro problem.** The manifest holds "макрос-процедура" — a reusable sequence of verbs with conditions/loops. That is a **program**. Putting a program "in a node" does not make it not-a-program; it makes it an interpreted DSL whose execution semantics are undefined. The abstract-thinker itself flagged this in §3.2.2 ("where does the procedure live? if in skill code → we lose 'graph explains itself'") — and then put it in the manifest node **without saying how it executes**. That is the same dodge, relocated.
2. **A manifest that grants "which lenses/types/scope are available" is an ABAC policy.** Per ADR-0002 §4, access/disclosure policy = a hard-ABAC LENS, first-party-only to register (R4). So the skill-manifest is not a new clean concept — it either **is** a bundle of hard-ABAC lenses (in which case say so, and the first-party-only gate applies, which constrains the marketplace vision), or it is something new that needs its own enforce-point. Unresolved.
3. **It is asserted, not tested against the §1 scenarios.** None of the 17 scenarios is actually played through the manifest to show it works. The abstract-thinker wrote the *criteria* for that test (§5) but did not *run* it. Criteria-without-execution is the same gap ADR-0002 left with "50 cells."

**This is the biggest hidden-complexity sink in the abstract-thinker's analysis** and the team-lead should treat "skill-manifest node" as an OPEN DESIGN PROBLEM, not a settled answer.

### Claim 2 (abstract, its own biggest doubt) — reactivity = type-node + engine-reactor, NO new verb; is there a hidden `subscribe`?
**Verdict: BROKEN as stated ("no new primitive"). Confidence: high. This is the most load-bearing defect in the whole council.**

The abstract-thinker is right to flag this and right to doubt it. Stress-testing it hard, the "no new verb" claim does not survive:

- A standing/reactive intent ("every morning collect what's stuck and send it") is **not** fully expressible as `createNode(type: subscription)`. Creating the subscription node is the *registration*. But registration implies a **runtime contract** the rest of the model does not have: (a) the engine must *evaluate a predicate continuously or on a schedule* — a temporal/event trigger primitive that is nowhere in the passport, edges, or the 3 control-plane kinds; (b) when the predicate fires it must *invoke an action with an actor/principal* — i.e. the reactor acts AS some principal, which means the trust-ladder (§3) and the valve (§3) must apply to an action **nobody synchronously requested**. The valve in ADR-0002 §3 is described for "перед любым необратимым внешним действием движок собирает прямо задействованные ноды" — it assumes a *caller* who passed arguments. A reactor has no synchronous caller and no argument list. **The valve's "directly-involved nodes" boundary is undefined for autonomous triggers.**
- So the hidden primitive is not necessarily a `subscribe` *verb* — but it **is** a new engine capability (a scheduler/event-reactor) AND a new semantics for the valve (who is the principal of an autonomous action, what is the "directly-involved" set when nobody called). "It's just a created node, no new primitive" is **false**: the node is inert without an execution engine that ADR-0002 does not describe, and that engine introduces a principal-attribution and valve-boundary question that is genuinely new.
- **Worst case if wrong:** this is, by the abstract-thinker's own words, "half the value of a life-aggregator." If the model cannot hold reactive intent without an undesigned reactor + an undefined valve-for-autonomous-actions, then a core value prop is sitting on an unspecified component. Declaring "no new primitive" makes the model *look* complete when its highest-value feature is unbuilt.

**Verdict detail:** the *claim* "reactivity needs no new verb" may be salvageable (the trigger could be a node). The *claim* "reactivity needs no new primitive / the model already holds it" is BROKEN — it needs (1) a reactor engine, (2) a principal-of-autonomous-action rule, (3) a valve-boundary for caller-less actions. All three are undesigned. And all three are **blocked on topic-4** (owner unanswered). See finding #2.

### Claim 3 (abstract) — push query semantics (depth/rollup/flat-mode) into selectable LENS/PATTERN nodes; does "graph explains itself" survive 200 lens nodes?
**Verdict: WEAK — solves the God-verb, creates a God-registry it does not cost. Confidence: medium-high.**

Moving depth/rollup/flat-mode out of `query`-parameters into selectable LENS/PATTERN nodes does correctly prevent `query` becoming a mini-language. **But it trades one problem for an un-costed other:**
- Every distinct combination of (anchor-mode × depth × rollup × flat/topo × sort × disclosure-class) that a skill needs is now a **node the agent must discover and select**. The abstract-thinker calls these "selectable" as if selection is free. It is not. With N domains × M reductions × K depth-modes the lens/pattern registry grows combinatorially, and **the agent now needs a capability to search/rank/choose among lenses** — which is itself a query problem (a meta-lens over the control-plane). The "map of variables" (architect C) is literally an attempt to make this navigable, which concedes the registry is large enough to need its own map.
- "The graph explains itself" was sold (ADR-0002) on the premise that a node's handling is readable from a thin passport. It does **not** obviously extend to "an unfamiliar skill can pick the right lens from 200 lenses by reading them." Reading 200 lens contracts to choose one is not self-explanation; it is documentation search. The abstract-thinker's own criterion §5.6 ("unfamiliar skill executes a new domain by ASKING control-plane nodes") is **asserted as achievable but never demonstrated**, and it gets *harder*, not easier, as the registry grows.

**Net:** the direction (semantics in control-plane, not in the verb) is right and I agree with it. But "simpler" is unproven. It relocates the God-verb risk into a **God-registry / lens-selection** risk that neither agent costs. The honest statement is "we moved query-complexity into the registry; the registry now needs a selection/ranking story we have not designed."

### Claim 4 (abstract) — dry-run/simulation is "maybe the one thing that needs a verb flag." Real or marginal?
**Verdict: REAL, and under-rated (should be louder). Confidence: medium-high.**

For a "platform for all of life" where the owner's central anxiety is **irreversibility** (the whole valve in ADR-0002 §3 exists for this), the ability to compute "what would happen if I do X" **without writing** is not marginal — it is the safety primitive that makes autonomous agents tolerable at all. D5 (reshuffle meetings) and D9 (decompose-this-way) are everyday. The abstract-thinker correctly notes CRUD writes immediately and has no "show the consequence without committing." I would go further: **dry-run is the natural companion of the valve.** A valve says "I won't let you do the irreversible thing"; dry-run says "let me show you what the irreversible thing would do first." A life-platform that can act but cannot simulate-before-acting is more dangerous, not less. This deserves to be a first-class open question, not a footnote "maybe one flag." Whether it is a verb flag, a lens mode, or an engine mode is open — but its *importance* is being undersold.

### Claim 5 (architect) — CONNECTOR = a TYPE-class node, not a 4th control-plane kind.
**Verdict: WEAK (peg-forcing; honest about being a bet, but the bet is shaky). Confidence: medium.**

This is the architect's least convincing move and it knows it ("revisit if practice forces it"). The argument is "fewer kinds at equal expressiveness (N-040), so connector = specialization of TYPE." But a TYPE's ratified contract (ADR-0002 §4) is `{ name, version, payload_schema, validate(node)→ok|errors }` — a connector's contract is `{ key_schema, capabilities: [read,edit,send,exists?], binds_to_types, resolver_ref }`. These barely overlap:
- A TYPE answers "how do I open/validate ONE cell's payload." A CONNECTOR answers "how do I perform external I/O against a third-party service." **`validate(node)` and `capabilities: [send]` are not the same kind of contract.** Calling both "TYPE" overloads TYPE to mean "any control-plane metadata node," which dilutes the very crispness that made 3 kinds defensible.
- A connector has an **external resolver / side-effecting capability** (`send`, `edit` against a live service). No TYPE, LENS, or PATTERN in ADR-0002 has outward side effects. The 3 kinds are all *internal graph operations* (interpret one cell / project a subgraph / compose a subgraph). A connector is the **first control-plane node that reaches OUTSIDE the graph.** That is a genuine categorical difference, not a specialization.
- It also directly entangles the valve: `requestExternalAction` must resolve a connector and the connector declares `capabilities: [send]`. So the connector is **on the trust/valve path**, which is precisely the place ADR-0002 R4 said registration must be first-party-only and tightly gated. Folding a side-effecting, valve-adjacent, marketplace-pluggable concept into "just a kind of TYPE" **understates its security weight.**

**Verdict:** "connector = TYPE-class" is forcing a peg to preserve the "3 kinds" headline. It is reversible (architect flags this), so not catastrophic — but the council should not record it as a clean fit. It is more honest to say: *connector is the first OUTWARD-FACING control-plane node; whether it is a TYPE-subclass or a 4th kind should be decided by its security/valve contract in ADR-0003, not by a "fewer kinds" preference applied early.*

### Claim 6 (architect) — nearest-first scope resolution (container→project→global) reconciles per-group vs reuse vs registry. Does lexical scoping survive multi-parent?
**Verdict: BROKEN for the multi-parent case. Confidence: high. This is the sharpest concrete defect in the architect doc.**

The CSS-cascade / lexical-scoping analogy assumes a **single resolution path** (one enclosing scope chain). ADR-0002 explicitly allows a node to be **multi-parent**: one home edge + arbitrary additional `member-of` edges into other containers (architect's own B.1). Now ask the question the architect did not:

> A node N lives in container A (home) and container B (ordinary member-of). Container A scopes the name `budget` to type T_A; container B scopes `budget` to type T_B. N references `type: budget`. **Which wins?**

"Nearest-scope-first (container → project → global)" has **no answer** here, because N has *two* containers at the same lexical distance via *different edges*. Lexical scoping is well-defined only on a tree (one parent chain). The model is a **DAG with multiple containment edges** — the very thing ADR-0002 spent its longest section (§2a, the romb rule) making deterministic for *cascade*. The architect reused "cascade goes along the home spine" for the lens/scope cascade (correctly) — but then proposed **name resolution** as plain "nearest-first" **without restricting it to the home spine**, so it inherits the romb ambiguity the cascade rule was built to kill, and does not apply the fix.

- **Either** name resolution must also be pinned to the home spine (then "container B's special type" is *invisible* to N when N's home is A — which may contradict N-068's "special type for users of this group" if N is in group B but homed in A);
- **or** name resolution allows all containers (then it is genuinely ambiguous and needs the same `cascade_order` + nearest + id tie-break the romb rule uses — which the architect did not specify).

**Worst case if ignored:** the same `type: budget` reference resolves to different types depending on traversal order — a non-deterministic type system. For a system whose whole pitch is "the engine handles a cell by its passport deterministically," a non-deterministic *type-name resolver* is a foundational bug. The architect's D2 ("confirm nearest-scope-first") is therefore **not safe to confirm as written** — it must first answer the multi-parent shadowing case.

### Claim 7 (architect) — "only ONE new thin primitive"; passport stays thin. Count honestly.
**Verdict: BROKEN as a headline ("thin"). Confidence: high.**

"Only one new thin primitive" (`scope_inherit?` edge field) is **rhetorical accounting.** Honest count of NEW surface the architect introduces:
1. `external_ref?: {connector, key}` passport field (generalized).
2. CONNECTOR node — a whole new control-plane node class with `key_schema`, `capabilities`, `binds_to_types`, `resolver_ref` (and an external resolver/adapter contract).
3. `scope` field on **every** control-plane node (type/lens/pattern/connector).
4. **Nearest-scope-first name-resolution algorithm** in the engine (which, per Claim 6, is under-specified and possibly broken).
5. `scope_inherit?` edge field.
6. Container-type payload: `default_lens`, `accepts_types`, `member_type_hint`, `compose_pattern`, `scope` (five fields).
7. Derived-composite node pattern (`derived:true` + `sensitivity:private` + disclosure-lens + engine derivation).
8. "Two modes = two PATTERN nodes" + `compose_pattern` reference.
9. The "variable map" LENS (new standing projection over control-plane).

The **passport** stays thin — true, only `external_ref?` is added. But the architect's own framing ("the complexity falls to the engine and control-plane") is doing the work: **the SYSTEM gains a large new surface, and "thin passport" is being used to imply "thin system."** Those are different claims. ADR-0002's value was a thin *cell*; that is preserved. But the council should not let "passport stays thin" stand in for "the design is small." It is not small — it is a substantial expansion of engine + control-plane, most of it un-validated, and the "thin" headline obscures that.

**Lens:** contradiction / honest-accounting. "One new thin primitive" (CRISP SUMMARY) vs the 9-item list the same document contains (NEW-vs-covered sections A.5, B.7, C.4) are inconsistent.

### Claim 8 (architect) — derived-composite node: disclosure-lens exposes a composite without leaking inputs. Privacy-sound?
**Verdict: BROKEN as an unqualified promise (inference/aggregation attack). Confidence: high.**

"A LENS exposes the *composite* to other places without exposing the hidden inputs" is **not generally true** and is dangerous to promise before ADR-0003. Classic inference attacks defeat it:
- **Composite + one known input reveals the others.** If composite C = f(a, b) and a downstream principal legitimately knows `a` and can read `C`, then for many `f` (sum, average, ratio) it recovers `b` — which it was *not* permitted to see. Disclosure of the composite **is** disclosure of a function of the secret inputs.
- **Differencing.** If C is recomputed as inputs change, observing C at t1 and t2 reveals the delta of the hidden inputs.
- **Small-domain / uniqueness.** If a hidden input has few possible values, the composite plus public context can uniquely pin it.

These are textbook (this is the entire field of statistical disclosure control / differential privacy). The architect treats "expose composite, hide inputs" as a clean disclosure-lens setting. It is **not** a setting — it is an unsolved-in-general problem requiring either query budgets, noise, or restricting which composites are disclosable based on what else the principal can read. **Worst case if ignored:** the system markets "private data combined and safely reused" and silently leaks the private inputs by inference — for a *life* platform holding health/finance/relationships, that is the highest-severity failure class. This must be flagged as NOT solved and explicitly deferred to ADR-0003 with the inference-attack risk named — not presented as a working pattern.

### Claim 9 (cross-cutting) — both route everything to control-plane / engine / ADR-0003: genuine win or deferral disguised as design?
**Verdict: PARTLY BROKEN — significant deferral disguised as design. Confidence: high.**

There is a real architectural win here (control-plane-as-data is a legitimately good pattern, and keeping the cell thin is sound). But the council is **over-using "route it to the engine/ADR-0003" as a way to mark hard problems as solved.** Inventory of what is "decided" by being deferred:
- Reactor execution semantics → "engine-reactor" (undesigned).
- Valve boundary for autonomous actions → ADR-0003 trust-horizon (open).
- Macro-procedure execution → "skill-manifest node" (undesigned).
- Lens/pattern selection at scale → "the map is a lens" (undesigned ranking).
- Scope name-resolution under multi-parent → "nearest-first" (broken, Claim 6).
- Composite privacy → "disclosure-lens" (broken, Claim 8) → ADR-0003.
- First-party gate / who-registers-what → ADR-0003.
- Cross-group analysis ABAC → ADR-0003.

**The thin passport looks elegant largely because every hard thing has been pushed into two undescribed components (the "engine" and "ADR-0003").** That is not illegitimate — phased design is fine — but the **risk** is concrete: ADR-0003 is now carrying so much load (trust horizon, scope, ABAC, disclosure, composite privacy, registration gates, verifier independence) that it may not be a single coherent ADR at all, and the "elegance" of ADR-0002 is partly an artifact of unbuilt downstream. The honest framing: *ADR-0002 + this council define a thin cell and a NAME for where complexity goes; they have not yet shown the complexity is tractable where it was sent.* The council should explicitly state that the thinness is **conditional on ADR-0003 succeeding at a large, currently-unsized job.**

### Claim 10 — did either agent actually produce the owner's "MAP of all variables," or convert it into "it's just a lens"?
**Verdict: BROKEN (the map was not produced; the ask was abstracted away). Confidence: high.**

The owner (N-065) asked, concretely: *"make a MAP of all such variables available in the system — grouped by folders/projects; some public, some hard-wired inside, some hidden-user combined and reused."* This is a request for a **deliverable artifact** — a navigable inventory he can look at. The architect's answer (C.1): *"The MAP is NOT a new artifact to maintain — it is a projection (a LENS) over control-plane nodes."* That is an architecturally correct statement about *how the map is generated* — and a **non-answer to what he asked for.** He asked to *see the map*; he got told *the map is a query you could run.* No actual map (even a sketch: "here are the variable classes — types, lenses, patterns, connectors, scopes, policies, derived-composites — and here is how public/internal/hidden attach") is laid out as the *content* he can react to. The architect produced the *mechanism of the map* and skipped the *map*. This is exactly the N-069 failure mode (answering a different, more abstract question than the one posed). **The owner's concrete ask is unmet.** A real next step owes him at least a first-draft enumerated map, not "it's a lens."

(Abstract-thinker did not own the map ask — it focused on verbs — so this is on the architect's side of the council.)

### Claim 11 — topic-4 ("first agent acts externally"): what is actually blocked until the owner answers?
**Verdict: SOUND that it blocks reactivity; UNDER-STATED how much else it blocks. Confidence: high.**

Both agents flag topic-4 blocks reactivity/valve. Enumerating fully, topic-4 (does an agent act outward autonomously, and under what trust model) blocks **more** than reactivity:
1. **Reactivity / standing intent** (abstract Cluster D) — a reactor that "sends every morning" IS an autonomous outward action. Blocked.
2. **CONNECTOR `capabilities: [send, edit]`** (architect A) — any connector with outward write capability is meaningless until we know whether/how an agent may invoke it autonomously. The *read* connectors are fine; the *write/send* ones are blocked.
3. **The valve's principal model** (ADR-0002 §3) — the valve assumes a synchronous caller. Topic-4 = "what happens when the actor is an agent acting on its own" → the valve's actor/principal attribution for non-human-initiated actions is undefined until topic-4 is answered.
4. **`requestExternalAction` verb semantics** — its whole point is outward effect; whether an agent can ever satisfy it autonomously (vs only proposing to a human) is the topic-4 question.
5. **Skill-manifest "macro-procedure"** (abstract) — a macro that ends in an external send is autonomous outward action mid-procedure. Blocked at the send step.
6. **Marketplace / 3rd-party agents** — the entire R4 first-party-only gate exists *because* outward-acting code is dangerous; topic-4 sets the policy that gate enforces.

So topic-4 is not "a blocker for reactivity." It is **the gate for the whole outward-action half of the platform** — connectors-that-write, the valve's autonomous-actor model, requestExternalAction, reactive macros, and marketplace trust. Read-only capability (most of query/lens/pattern, read-connectors, the map) is **not** blocked and can proceed. The council should draw that line explicitly: **read side is unblocked and designable now; the entire write-outward side is blocked on topic-4** and should not be designed in detail until the owner answers, or it will be redesigned.

---

## 2. TOP real defects/risks (ranked)

1. **[CRITICAL] Reactivity is declared "no new primitive" but is structurally unheld** (Claim 2). It needs an undesigned reactor engine + a principal-of-autonomous-action rule + a valve-boundary for caller-less actions. This is, by the council's own words, half the product's value, and it is sitting on unbuilt components. Do NOT let the council record reactivity as "solved / just a node."
2. **[CRITICAL] Scope name-resolution is broken under multi-parent** (Claim 6). "Nearest-scope-first" assumes a tree; the model is a DAG with multi-container membership. Two containers shadowing the same type name at equal distance → non-deterministic type resolution. The romb rule (ADR-0002 §2a) fixed this for *cascade* but was not applied to *name resolution*. D2 is not safe to confirm as written.
3. **[CRITICAL] Composite-privacy promise is false in general** (Claim 8). "Disclosure-lens exposes the composite without leaking inputs" is defeated by inference/differencing/uniqueness attacks. For a life platform (health/finance), this is the highest-severity failure class. Must be flagged unsolved and deferred to ADR-0003 with the attack named — not presented as a working pattern.
4. **[CRITICAL] topic-4 blocks the ENTIRE outward-action half**, not just reactivity (Claim 11): write-connectors, the valve's autonomous-actor model, requestExternalAction, reactive macros, marketplace trust. Designing any of these before the owner answers risks total rework. The read side is unblocked.
5. **[CONCERN] "Thin passport" is masking "thin system"** (Claim 7 + Claim 9). The passport is thin; the *system* gains a large, mostly-unvalidated new surface, all pushed into "engine" + "ADR-0003." The elegance is conditional on ADR-0003 succeeding at a job nobody has sized. Risk: ADR-0003 is overloaded to the point of incoherence.
6. **[CONCERN] skill-manifest node is undefined and re-imports the macro/DSL problem and the ABAC problem** (Claim 1b). It is the load-bearing answer to N-066 yet is one line. Treat as open, not settled.
7. **[CONCERN] The owner's concrete "MAP of variables" ask was not delivered** (Claim 10) — it was abstracted into "the map is a lens." He asked to *see* a map; he got the *mechanism*. This is the exact N-069 mis-framing the owner pre-warned against. Owe him a first-draft enumerated map.
8. **[CONCERN] God-verb risk was traded for an un-costed God-registry / lens-selection risk** (Claim 3). Moving semantics into selectable lenses is right, but "selection is free" and "graph explains itself at 200 lenses" are unproven; the registry needs its own ranking/search story.
9. **[PROVOCATION] CONNECTOR = TYPE-class is peg-forcing** (Claim 5). The connector is the first *outward-facing, side-effecting, valve-adjacent* control-plane node — categorically different from interpret/project/compose. Decide its kind by its security contract in ADR-0003, not by an early "fewer kinds" preference.
10. **[PROVOCATION] dry-run/simulation is under-rated** (Claim 4). For an irreversibility-anxious life platform, simulate-before-act is the natural companion of the valve, not a "maybe one flag." Promote to a first-class open question.
11. **[NOTED] The two agents are in unreconciled tension** (§0): "the contract is posed too narrow, design an explicit capability layer" (abstract) vs "no new mechanism needed, it's covered, keep it thin" (architect). The council has not resolved this. Watch that the synthesis does not silently pick one and call it consensus.

---

## 3. What the owner must decide that the two agents glossed

These are decisions the council cannot make for him and that the two docs either deferred or assumed:

- **D-owner-1 (topic-4, already open, now shown to be the master gate):** Does an agent ever act OUTWARD autonomously (send/edit/pay), or may it only *propose* and a human commits? This single answer unblocks/blocks: reactivity, write-connectors, requestExternalAction, reactive macros, and the marketplace trust model. **Nothing on the write-outward side should be designed until this is answered.** (The agents flagged it for reactivity only; it is far bigger.)
- **D-owner-2 (the map he actually asked for):** He wants to *see* the variable map. Decide whether the next deliverable includes a **first-draft enumerated map** (variable classes × visibility tiers), not just the statement "it's a lens." (The architect glossed this into a mechanism.)
- **D-owner-3 (multi-parent type shadowing — a real ambiguity, not a preference):** When a node belongs to two containers that define the same type name differently, which wins? This is a correctness decision (deterministic vs ambiguous type system), not a style choice. The architect's "nearest-first" does not answer it. (Glossed entirely.)
- **D-owner-4 (how much may live in "the engine" before it's specified):** The council keeps routing hard problems to "the engine" and "ADR-0003." Decide whether to keep going wide on the model now, or pause and force at least a *skeleton* of the reactor + valve-for-autonomous + scope-resolver, because three CRITICALs all live there and "it's in the engine" is currently doing the work of a design. (Both agents glossed by deferring.)
- **D-owner-5 (privacy posture for composites):** Is "private data combined and reused elsewhere" allowed at all before a disclosure-control model exists? Given the inference-attack reality (Claim 8), this may need to be *blocked* until ADR-0003 defines query budgets / disclosure rules, rather than offered as a working feature. (The architect presented it as working.)
- **D-owner-6 (the unreconciled meta-question):** Is the verb contract genuinely under-posed and in need of an explicit, designed capability/manifest layer (abstract-thinker), or is the existing thin model already sufficient and everything just gets *placed* (architect)? The two agents disagree on the fundamental posture, and N-069 explicitly asked which framing is right. The owner (or a synthesis round) must pick — not paper over it.

---

## 4. What I looked for but did NOT find problems with

- **Container = node, containment = home/belonging edges, multi-parent = ordinary edges (architect B.1).** Solid. This part of N-068 genuinely IS already expressible; "zero new mechanism for the container itself" holds. Agent-built containers staying invariant-safe (B.6) is sound by construction (non-home edges can't corrupt the single-home spine).
- **Rejecting payload-type inheritance (architect Reading 1, B.2).** Correct and important. "A document inside a project is still a document" is right; type is identity, not inherited. Good catch by the architect.
- **Default-lens cascade along the home spine for "container augments its contents" (architect B.2 item 1).** This legitimately reuses the ratified §2a cascade — no new mechanism, sound.
- **The 3-layer *direction* (abstract §4): richness in data/control-plane, narrow stable verb surface.** The *direction* is right and well-argued, even though "dissolves" overclaims and the manifest is underspecified. The instinct to invert the method (capability-first discovery, verbs as minimal residue) is the correct response to N-066/N-069.
- **`external_ref?: {connector, key}` as the passport footprint (architect A.2).** The passport-side shape genuinely IS thin and pluggable; the Ports-&-Adapters framing is apt. My objection (Claim 5) is about *where the connector node sits in the kind taxonomy*, not about the passport field, which is clean.
- **Abstract-thinker's quality criteria for G (§5).** The 8 gate criteria are genuinely good (O(1)-verbs-in-domains, the 4-CRUD-blind-zones test, the not-God-verb test). My only objection is they were written but not *run* — the criteria themselves are sound and should be adopted as the actual gate.
