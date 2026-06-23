# Architect — Containers + Generalized external_ref + Type/Variable Map

- **Role:** system-architect (design council, FF-Personal-Management)
- **Date:** 2026-06-23
- **Topic:** (A) generalized `external_ref` · (B) container = node (group/folder/project as a cell) · (C) map of all variables/types available in the system
- **Grounded in:** ADR-0002 (ratified thin passport), SYNTHESIS-2026-06-21-next §1 (validation, `external_ref?`, "don't blur the thin passport under container pressure"), THREAD N-061..N-069 (owner voice msg 240), STATE.md.
- **Phase:** DESIGN, not build. No code. Output = mechanisms + where they live.

---

## 0. Framing — the load-bearing test applies to all three

Everything below is judged by ADR-0002's **load-bearing invariant**: *a field is load-bearing iff the AI/engine decides HOW to treat a cell by it, WITHOUT opening payload and WITHOUT knowing the type.* The owner's three asks (typed ref, container-shares-type-down, variable map) all pressure the passport to fatten. The architectural discipline — and the project's own rule "thin core + engine + modules; divide by MODELS, not logic" — says: **the passport must stay thin; the complexity falls to the engine and the control-plane-as-nodes.** This document's whole job is to route each ask to its correct home.

Three patterns carry the design:
- **A → Registry + Adapter (Ports & Adapters).** `external_ref` becomes a typed pointer resolved by a connector registry, never a hardcoded string shape.
- **B → Composite + Scope/Decorator.** A container is a node; "shares its type down" is a *cascade of a control-plane reference along the home spine*, not payload inheritance.
- **C → Registry projection (a LENS over the control-plane).** The "map of variables" is not a new artifact — it is a **lens that queries the existing TYPE/LENS/PATTERN nodes**, with visibility expressed as a property of registration (scope + ABAC), not a fourth passport field.

---

## A. Generalize `external_ref` — typed, pluggable outward pointer

### A.1 What ADR-0002 already covers (baseline)
- `canonical_id?` — optional passport field, an **inward** dedup reference, engine-written. (§5, ratified.)
- `external_ref?` — proposed in SYNTHESIS §1 as `canonical_id`'s **outward** twin (R1 addition, not yet in ADR-0002 text). Sketched as `message_id / chat_id / uri`.
- N-062 — *some TYPES do not store data inline; they declare WHERE to read from* (a pointer, not a supplement).

So the baseline is: "there is an optional outward pointer." The owner's N-065 input is: **its shape must not hardcode `telegram/chat/message`** because the system is a plugin system and many same-kind connectors will attach.

### A.2 NEW mechanism — `external_ref` as a typed reference resolved by a CONNECTOR node

**Shape (passport stays thin — one optional field, two scalar sub-keys):**

```
external_ref?: {
  connector: <node-id>,   # id of a CONNECTOR node in the control-plane
  key: <string>           # opaque locator, MEANING defined by that connector
}
```

That is the entire passport footprint: **a pointer to a connector node + an opaque key.** The passport does NOT know what `key` means — exactly like it does not know what a `type`'s payload schema is. The passport is still readable without payload and without knowing the connector: the engine sees "this node points outward via connector X, key Y," which is enough to decide *handling* (it is externally-anchored; route external operations through connector X).

**Where the structure lives — the CONNECTOR node (control-plane).** This is the resolution of N-065's "names resolved by a KEY of the TYPE itself" and "constructor of what it's composed of." A connector is a control-plane node (see A.4 for which kind) that declares:

```
connector {
  name: "telegram" | "gmail" | "gcal" | "fs" | ...,   # human label, not used for resolution
  key_schema: { chat_id: string, message_id: string }, # the "constructor of what it's composed of"
  capabilities: [ "read", "edit", "send", "exists?" ], # what external operations it supports
  binds_to_types?: [ <type-id> ],                       # which node types may use this connector
  resolver_ref: <adapter contract>                      # how the engine/module talks to the service
}
```

So `external_ref.key` is validated against `connector.key_schema`, not against a hardcoded global shape. One user's `message` node points at the `telegram` connector; another's at `signal`; the passport field is byte-identical for both. **This is the Ports & Adapters pattern:** the passport is the port (uniform `{connector, key}`), connectors are the adapters (each defines its own key shape + capabilities), the engine talks only to the port.

### A.3 Relationship to N-062 ("type declares where to read from")
N-062 and N-065 converge on **one mechanism with two faces**:
- **Type-side declaration** (N-062): a TYPE may declare `storage: external` and name a default connector. This says "instances of this type live OUTSIDE; expect `external_ref`."
- **Instance-side pointer** (N-065): the individual node carries `external_ref: {connector, key}` filling in the actual locator.

The TYPE declares the *contract* (this kind reads from outside, via a connector matching this capability); the INSTANCE declares the *coordinate*. This is the same TYPE/INSTANCE split the model already uses for payload schema — no new concept, reused.

### A.4 Where the CONNECTOR node lives — control-plane, as a TYPE-class node (NOT a 4th kind)
ADR-0002 froze **3 control-plane kinds: TYPE · LENS · PATTERN.** Do NOT add a 4th. A connector is best modeled as a **TYPE-class control-plane node** (it is fundamentally "how to interpret/handle a class of cells" — here, externally-stored cells), carrying the extra `key_schema` / `capabilities` / `resolver_ref` block. Concretely: `connector` is a *type whose payload lives behind an adapter* — it is metadata about an integration, self-hosted as a node like every other control-plane fact ("everything visible to the AI" holds for connectors too). If practice shows connectors need their own enforce-points/lifecycle distinct from TYPE, revisit — but the default, per N-040 (fewer kinds at equal expressiveness), is **connector = specialization of TYPE**, not a new root.

### A.5 NEW vs covered (A)
- **Covered by ADR-0002 / SYNTHESIS:** the existence of an outward optional pointer (`external_ref?`), the TYPE/INSTANCE split, control-plane-as-nodes.
- **NEW:** (1) `external_ref` shape = `{connector: node-id, key: string}` instead of `{message_id, chat_id, uri}`; (2) the **CONNECTOR node** (a TYPE-class control-plane node) holding `key_schema` + `capabilities` + `resolver_ref`; (3) resolution rule "key validated against connector.key_schema, not a global shape"; (4) the engine's external-action path resolves the connector node before calling the service — so the agent verb `requestExternalAction` is connector-agnostic.

---

## B. Container = node ("group/folder/project as a cell that shares its type down")

This is the densest ask and the one that most threatens the thin passport. The owner (N-068) wants: a group is a CELL that groups AND *augments its contents with itself*, *sharing its (hidden) data type DOWN* to everything inside; "two modes that unite folders"; nested folders (project/planning/documents/analysis/notes); **each agent builds its own container**; group-in-group "by types" hints placement; types reusable across groups; a special type may be created FOR a group; groups ISOLATE a project's data area but from the top you can go higher and analyze across all groups.

### B.1 The container itself — NO new passport mechanism needed
A container is **just a node** whose `type` is a container-type (`container`, or refinements `project`, `folder`, `plan-group`). Its members belong to it via the **already-ratified home edge / belonging edges** (N-061 already framed "folder = home hierarchy, not filesystem folder"). So:
- Containment = belonging edges. Nesting = chains of home edges (the cascade spine).
- "Each agent builds its own container" = an agent creates a container node and `link`s members to it. No invariant breaks: the members still have **exactly one home**; a member can additionally belong to other containers via ordinary (non-home) edges (multi-parent, already allowed). **Single-home is NOT violated** — a file's home is its primary container; appearing in another agent's analysis-container is an ordinary `member-of` edge.

So far: **zero new mechanism.** This is the load-bearing answer — most of N-068 is already expressible.

### B.2 "Container shares its (hidden) type DOWN" — the one genuinely new question

This is the crux and the tension. Three candidate readings; I rule on each:

**Reading 1 — container shares its *payload type* down (members inherit the container's `type`).** REJECT. This breaks thin-passport and the open-type model: a node's `type` is its own identity; a "document" inside a "project" is still a document, not a project. Type is not inheritable down a hierarchy.

**Reading 2 — container *applies a default LENS / default context* down (the "hidden type" = a control-plane reference, not a payload type).** ACCEPT — this is the correct model. Re-read N-068: "shares its (hidden) **data type**" + "special type created FOR a group (users of this group)" + "group-in-group by types hints WHERE to put a file." What is actually being shared down is **how the group's contents are interpreted/scoped/placed** — that is a control-plane attachment (a default LENS, a default TYPE-hint for placement, a SCOPE), NOT the members' own payload type.

**Reading 3 — container injects a SCOPE down.** ACCEPT, and this is the precise mechanism for the parts of "share down" that are about isolation/visibility (the "special type for users of this group", isolation of a project's data area). See B.4.

**So "shares type down" decomposes into two existing mechanisms + one thin new edge field:**

1. **Default-LENS cascade** (interpretation): the container declares `default_lens: <lens-id>`; the engine, when projecting a member with no explicit lens, **inherits the container's default lens along the home spine** — using the *already-ratified cascade mechanism* (§2a of ADR-0002: "cascade of default lens goes along the home edge"). This is literally listed in ADR-0002 as a thing the home edge already cascades. **No new mechanism** — N-068's "augments contents with itself" = default-lens + default-context cascade that the home spine already carries.

2. **Placement-hint via TYPE** ("group-in-group by types hints where to put a file"): the container declares `accepts_types: [<type-id>]` and/or `member_type_hint: <type-id>`. When an agent adds a node, the engine/agent reads the container's `accepts_types` to suggest the right sub-container. This is a **soft routing rule stored on the container node's payload**, NOT a passport field and NOT enforced as an invariant (it's a hint). This is the project's "TYPE node carries placement rules" idea, scoped to a container.

3. **One thin NEW edge field — `scope_inherit?`** (see B.4): marks that the container's SCOPE cascades to members. This is the only genuinely new primitive, and it lives **on the edge / as a SCOPE node**, not on the passport.

**Verdict on the crux:** "container shares its type down" is **a cascade of control-plane references (default lens + scope + type-hint) along the home spine — NOT payload-type inheritance, NOT a passport change.** The passport of a member node is untouched. The container fattens its OWN payload (it declares `default_lens`, `accepts_types`, `scope`), which is fine — that's the container type's payload, exactly where complexity belongs.

### B.3 The "two modes that unite folders" — resolved as two PATTERN nodes
N-068: "maybe TWO modes that unite folders (group all user results into one / plan grouped by different LEVELS; one may have max one level)." This maps cleanly onto the **PATTERN** control-plane kind (ADR-0002 §4: "PATTERN = assemble a subgraph from many; `compose / recursion_terminator / maxDepth`"):

- **Mode 1 — FLAT aggregation ("group all results into one"):** a PATTERN with `maxDepth: 1` — collect direct members, no deep nesting. ("one may have max one level" = this mode.)
- **Mode 2 — LEVELED grouping ("plan grouped by different LEVELS"):** a PATTERN with `recursion_terminator` on the `level` axis — assemble members grouped/nested by abstraction level (why/what/how/data) or by sub-container depth.

So the "two modes" are **two PATTERN nodes**, not two new mechanisms. A container declares which pattern composes it: `compose_pattern: <pattern-id>`. This is exactly what PATTERN was ratified for. **No new mechanism — reuse of PATTERN.**

### B.4 Isolation + "analyze across all groups" — this is SCOPE (and ties to ADR-0003 ABAC)
N-068: groups "ISOLATE a data area for a project BUT from the top level you can go higher and analyze across all groups." This is a **two-level visibility model**:
- **Inside a group:** queries default-scope to the group (isolation — an agent working in project X sees project X's subgraph by default).
- **From the top:** a higher-scoped principal/lens can query *across* all groups (cross-group analysis).

This is precisely **SCOPE**, and SCOPE is an ABAC concern → **ADR-0003**, not the passport. Mechanism:
- A container declares a `scope: <scope-id>` (its data area). Members **inherit scope along the home spine** if the edge carries `scope_inherit: true` (the one NEW thin edge field, B.2 item 3) — default true for home edges into a scoped container.
- A LENS (hard-ABAC class, ADR-0002 §4) decides whether a given principal sees within-scope-only or cross-scope. "Go higher and analyze across all groups" = a cross-scope lens available to a sufficiently-privileged principal.
- This is **default-deny-friendly** (STATE.md: modules/users default-deny unlocks ABAC + marketplace): a group isolates by default; cross-group is a granted capability.

**So isolation/visibility = SCOPE + ABAC-lens → ADR-0003.** The passport already has the thin `principal` slot that makes this enforceable; it does not need a new field.

### B.5 "Special type created FOR a group" + "types reusable across projects" — namespacing (defer detail to C)
N-068 raises both "a special type may be created FOR a specific group" AND "types are reusable across projects/groups." These two pull opposite ways (per-group specialization vs global reuse) — that is the namespacing question, answered in C.3.

### B.6 How an agent-built nested hierarchy stays consistent with engine invariants
"Each agent builds its own container and decides what's inside" raises: do agent-built hierarchies stay valid? Yes, because the engine enforces the **same belonging invariants** ratified in ADR-0002 §2a regardless of who builds them:
- Exactly one `home:true` per member (engine rejects 0/2+).
- Home spine stays acyclic (cycle-guard + maxDepth).
- Re-home on container deletion (the ratified orphan rule: re-hang home to lowest-`cascade_order` parent, else inbox).
- An agent's "analysis container" links members via **non-home** edges → never competes for the single home → never corrupts the cascade spine.

So agent autonomy in building containers is **safe by construction** — the agent gets a verb to create a container and link members; the engine guarantees the invariants. This is the project's "thin core enforces invariants; agents/modules are free above it."

### B.7 NEW vs covered (B)
- **Covered by ADR-0002:** container = node; containment = belonging/home edges; nesting = home chain; multi-parent = ordinary edges; default-lens-cascade along home spine (already named §2a); belonging invariants (one home, romb rule, re-home); PATTERN as the compose mechanism.
- **NEW:** (1) `scope_inherit?: bool` edge field (one thin primitive, default true for home-into-scoped-container) — cascades SCOPE down; (2) container-type payload fields `default_lens` / `accepts_types` / `member_type_hint` / `compose_pattern` / `scope` (all in the CONTAINER TYPE's payload, NOT the passport); (3) the explicit mapping "two modes = two PATTERN nodes (flat maxDepth-1 vs leveled)"; (4) routing the entire isolation/cross-group-analysis question to SCOPE + ABAC-lens in **ADR-0003**.

---

## C. "Map of all variables/types available in the system"

N-065: make a MAP of all "variables" available — grouped by folders/projects; some PUBLIC (whole project), some HARD-WIRED inside, some HIDDEN-user-data combined into one and reused elsewhere.

### C.1 What a "variable" is here, and what the map IS
The owner's "variables" = **the reusable declared things the system exposes**: types, lenses, patterns, connectors, scopes, policies, and (the "hidden user data combined into one") **derived/composite values reused across places**. The MAP is NOT a new artifact to maintain — it is a **projection (a LENS) over the control-plane nodes that already exist.**

This is the cleanest possible answer: control-plane is already nodes (ADR-0002 Principle 0 / §4). A "map of all available types/variables" is therefore just `query(kind ∈ {TYPE, LENS, PATTERN, CONNECTOR, SCOPE, POLICY})` projected and grouped. **The registry is the graph itself; the map is a lens reading it.** Nothing new to store — "the graph explains itself" (SYNTHESIS §3).

### C.2 Visibility (public / internal / hidden) — a SCOPE + registration property, NOT a passport field
N-065's three visibility tiers map to **how a control-plane node is registered**, expressed as `scope` + ABAC, not a new passport field:

| Owner's word | Mechanism | Where it lives |
|---|---|---|
| **PUBLIC** (whole project) | control-plane node with `scope: project` (or global) — visible to all principals in the project | SCOPE on the node + ABAC-lens read rule |
| **HARD-WIRED inside** | control-plane node with `scope: <container-id>` + ABAC `disclosure: internal` — usable inside, not exported | SCOPE = the container; visibility = ABAC-lens |
| **HIDDEN user-data combined into one, reused elsewhere** | a **derived/composite node** (`derived:true`, `provenance: auto`, `rule_ref`) with `sensitivity: private` — the engine composes hidden inputs into one value; a LENS exposes the *composite* to other places without exposing the hidden inputs | engine (derivation) + SCOPE + disclosure-lens |

So **visibility is NOT a property of TYPE registration as a new enum** — it is `scope` (where it's usable) + ABAC-lens `disclosure` (what's revealed) + `sensitivity` (privacy of inputs). This is exactly ADR-0003 territory. The thin passport already carries `sensitivity` + `principal`, which is enough; the rest is control-plane + engine.

**The "hidden user data combined into one and reused" is the most interesting sub-ask:** it is a **derived composite node** — the engine combines private inputs (e.g., several private metrics) into one node marked `derived:true` + `sensitivity:private`, and a disclosure-lens lets *other places* reference the composite without seeing the raw private inputs. This is the project's "auto-edges/derived = engine, not file-truth" mechanism (ADR-0002 edge `derived`/`rule_ref`) applied to a *value* rather than an edge. It reuses the **canonical-node + projections** idea (SYNTHESIS §4: "truth in one place, interpretation in others").

### C.3 Namespacing — reconciling "per-group special type" + "reuse across projects" + "open global registry"
This is the real architectural decision in C (and the unresolved half of B.5). Three forces:
1. Open global type registry (ADR-0002 / ADR-0001 "open types").
2. Types reusable across projects/groups (N-068).
3. A special type created FOR one group ("users of this group") (N-068).

**Resolution — scoped registry with resolution order (the same pattern as CSS cascade / language scoping):**
- Every control-plane node (type/lens/pattern/connector) has a **`scope`**: `global | project:<id> | container:<id>`.
- Type *names/refs resolve nearest-scope-first*: when a node references `type: budget`, the engine resolves it as **container-scope → project-scope → global**, first match wins. (This is exactly N-065's "names resolved by a KEY of the TYPE itself" generalized to all control-plane refs.)
- **Reuse across projects** = register the type at `global` (or `project` and reference by id from elsewhere — ids are global, scope only governs *name* resolution and *default visibility*).
- **Special type for one group** = register at `container:<id>` scope; it shadows the global name within that container only, and is invisible/unusable outside (isolation, B.4).
- **Open registry preserved** = anyone (first-party) can add types at any scope; nothing is closed. ABAC governs *who* may register at *which* scope (e.g., third-party code: only `container` scope, never `global` hard-ABAC — the first-party-only gate from ADR-0002 R4).

So the three forces coexist: **ids are global and stable; NAME resolution and DEFAULT visibility are scoped nearest-first; ABAC governs registration rights per scope.** No contradiction — this is a standard lexical-scoping model layered over a flat id space.

### C.4 NEW vs covered (C)
- **Covered by ADR-0002:** control-plane = nodes (so the registry already exists); the map = a LENS query over it; `sensitivity` + `principal` in passport; `derived`/`rule_ref` on edges; first-party-only registration gate (R4).
- **NEW:** (1) the explicit statement *"the variable/type map = a LENS projection over control-plane nodes — no new artifact"*; (2) the **`scope` field on control-plane nodes** (`global | project:<id> | container:<id>`) with **nearest-scope-first resolution** — this is the namespacing primitive that reconciles per-group vs global-reuse vs open-registry; (3) the **derived-composite node** pattern for "hidden user data combined into one, reused elsewhere" (engine-derived value + disclosure-lens, reusing `derived`/`sensitivity`); (4) the visibility tiers (public/internal/hidden) mapped to `scope` + ABAC-`disclosure` + `sensitivity`, explicitly **NOT** a new passport enum → ADR-0003.

---

## TENSIONS (where the owner's asks conflict with thin-passport / single-home / open-registry — and my resolution)

| # | Tension | Owner ask vs invariant | My resolution |
|---|---|---|---|
| **T1** | **Container "shares its type DOWN" vs thin passport** | N-068 wants the container to push its type onto members; the passport must NOT fatten and a member's `type` is its own. | "Shares down" = **default-LENS + SCOPE cascade along the home spine** (already-ratified §2a mechanism) + container-payload `accepts_types` hint — **NOT** payload-type inheritance and **NOT** a passport field. Member passport untouched; container fattens its own payload. |
| **T2** | **Container-cascade vs "exactly one home"** | A node can be in many containers (multi-parent) AND inherit a container's context — but cascade needs a single deterministic spine. | Keep ADR-0002's rule verbatim: **exactly one `home` edge = the cascade spine**; other container memberships are ordinary edges (opt-in `cascade:true` + `cascade_order` if they should contribute). Single-home is **NOT** broken; the "primary folder" is the home, secondary appearances are ordinary edges. |
| **T3** | **Per-group special type vs open GLOBAL type registry** | N-068 wants a type scoped to one group; the model has an open *global* registry; N-065 wants reuse across projects. | **Scoped registry, nearest-scope-first name resolution** (C.3): ids global+stable; `scope: global\|project\|container` governs name resolution + default visibility; reuse = register global, specialize = register container-scope. Open registry preserved (anyone first-party can add at any scope; ABAC gates which scope). |
| **T4** | **`external_ref` flexibility vs passport thinness** | N-065 wants pluggable connectors, possibly a "constructor of what it's composed of" — risks a rich nested object in the passport. | Passport carries only `{connector: id, key: string}` (two scalars). The *constructor / key_schema / capabilities* live on the **CONNECTOR node** (control-plane). Passport stays thin; flexibility lives in the registry. |
| **T5** | **"Map of all variables" + visibility tiers vs thin passport** | Owner wants public/internal/hidden visibility — tempting to add a `visibility` passport field. | Visibility = **`scope` (control-plane) + ABAC-`disclosure` lens + existing `sensitivity`** — **NOT** a new passport field. The map itself is a LENS, not a stored artifact. |
| **T6** | **Connector / Scope as possible 4th & 5th control-plane kinds vs ratified "3 kinds"** | A, B, C each introduce a registry-ish concept (connector, scope) that could each become a new control-plane root. | **Hold the line at 3 kinds.** CONNECTOR = a **TYPE-class** node (A.4). SCOPE = a **property/field** on control-plane nodes + an axis of hard-ABAC **LENS** (B.4), not a root kind. POLICY already = LENS-class (ADR-0002 §4). Add a kind only if practice forces it (reversible, R1). |
| **T7** | **"Each agent builds its own container" autonomy vs engine invariants** | Free-form agent-built hierarchies could violate one-home / acyclicity. | Safe by construction (B.6): agent's analysis containers link via **non-home** edges; engine enforces one-home/cycle-guard/re-home identically regardless of author. Autonomy above the thin core; invariants in the core. |

---

## CRISP SUMMARY (for the owner to decide)

### NEW mechanisms proposed (4)
1. **CONNECTOR node** (control-plane, a TYPE-class node) holding `key_schema` + `capabilities` + `resolver_ref`; `external_ref?: {connector: node-id, key: string}` in the passport resolves THROUGH it. Replaces hardcoded `telegram/chat/message`. [A]
2. **`scope` on control-plane nodes** (`global | project:<id> | container:<id>`) with **nearest-scope-first name resolution** — the namespacing primitive that reconciles per-group special types, cross-project reuse, and the open global registry. [B.5/C.3]
3. **`scope_inherit?: bool` edge field** (default true for home-into-scoped-container) — the one new thin edge primitive that cascades a container's SCOPE down the home spine. [B.4]
4. **Derived-composite node** pattern for "hidden user data combined into one, reused elsewhere" — engine-derived value (`derived:true` + `sensitivity:private`) exposed to other places via a disclosure-lens, without revealing raw private inputs. [C.2]

### What stays in PASSPORT vs moves where
- **Passport (thin, unchanged in spirit):** add only `external_ref?: {connector, key}` (the SYNTHESIS R1 addition, now generalized). Everything else stays out.
- **EDGE:** one new field `scope_inherit?`. (Belonging/cascade/home all already there.)
- **CONTROL-PLANE (nodes):** CONNECTOR (as TYPE-class); `scope` field on type/lens/pattern/connector; the "two container modes" = two **PATTERN** nodes (flat maxDepth-1 / leveled); container-type payload fields (`default_lens`, `accepts_types`, `member_type_hint`, `compose_pattern`, `scope`).
- **ENGINE:** connector resolution; nearest-scope-first type-name resolution; default-lens + scope cascade along home spine; derived-composite computation; the "variable map" LENS execution. Invariants (one-home, romb, re-home, cycle-guard) unchanged.
- **ADR-0003 (ABAC):** group isolation + cross-group analysis (SCOPE + hard-ABAC lens); visibility tiers public/internal/hidden (= scope + disclosure + sensitivity); first-party-only gate on `global`/hard-ABAC registration; disclosure of composites.
- **Container itself:** NO new passport mechanism — it is a node, containment = home/belonging edges, "shares type down" = control-plane cascade (NOT payload-type inheritance).

### What is NEW vs already-covered by ADR-0002
- **Already covered (do not re-decide):** container=node; containment/nesting = home edges; multi-parent = ordinary edges; default-lens cascade along home spine; one-home/romb/re-home invariants; PATTERN as compose; control-plane=nodes (so the "map" registry already exists); `sensitivity`+`principal` in passport; `derived`/`rule_ref`; 3 control-plane kinds; first-party-only registration gate.
- **Genuinely NEW:** the 4 mechanisms above — all land in control-plane/engine/edge/ADR-0003, **none fatten the passport** beyond the single generalized `external_ref?`.

### Top tensions for the OWNER to decide
- **D1 (T1/B.2):** Confirm "container shares type down" = **default-lens + scope cascade**, NOT members inheriting the container's payload type. (My recommendation: yes — payload-type inheritance is rejected.)
- **D2 (T3/C.3):** Confirm **nearest-scope-first** name resolution (`container → project → global`) as the namespacing model. This is the one decision that locks per-group-vs-reuse-vs-open-registry together.
- **D3 (T6):** Confirm we **hold at 3 control-plane kinds** (CONNECTOR = TYPE-class, SCOPE = field+ABAC-lens), and add a 4th/5th root only if practice forces it. (Recommendation: hold; reversible if wrong.)
- **D4 (scope of next ADR):** Most of the visibility/isolation/cross-group complexity routes to **ADR-0003 (ABAC)** — confirm that ADR-0003 absorbs SCOPE, not a separate ADR. And the generalized `external_ref?` + CONNECTOR node is a clean **R1 amendment to ADR-0002** (the SYNTHESIS already proposed `external_ref?`; this just fixes its shape) — confirm we amend ADR-0002 rather than open a new ADR for it.
