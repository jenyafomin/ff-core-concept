---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: steelman-(a)
title: "LENS A — strongest honest case FOR an engine-side host registry (root of trust, decision-4)"
scope: Project (FF-Personal-Management) · adversarial round, one side only
related:
  - ../FORK-decision4-root-of-trust.decision.md            # the fork; recommends (c), refutes (a) as same-uid false-closure
  - ../../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md  # §2 fork as posed
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md  # ISO-2→ISO-3, gateway M3 = first out-of-process, G4, P-5
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant: authority ≠ attribution; form ② reserved-in-code
adversary_note: >
  This is a deliberate one-sided steelman of option (a). A sibling lens argues (c);
  a critic red-teams both. Read all three before the owner decides. Where (a) is
  weaker than (c) is stated honestly in §4 — a steelman that hides its flank is useless.
---

# LENS A — steelman: engine-side host registry as the root of trust

> One-line verdict up front: **(a) is right as reserved DATA (a concrete schema + fixed
> placement + a canary), wrong as a live enforcement CLAIM — and the fork's own winning
> synthesis already adopts (a) in that exact form while calling it "(c)". The honest
> contest is not A-vs-C; it is "reserve the concrete object now" vs "reserve only the
> prose intention now."**

---

## 1. Strongest case FOR (a)

Option (a) = an engine-side static registry of legitimate host-stampers, owner-writable only,
not writable by gateway/agent. The strongest honest case does **not** rest on "the agent
can't write it today" (that claim is empty — see §2). It rests on four load-bearing props:

**Prop 1 — The append-only retrofit logic that already justified reserving form ② applies
identically to the registry SCHEMA.** ADR-0010 ② reserved `PrincipalAssurance` (per-axis
trust + `issuer` + delegation slot) *in code, empty of behavior*, on one argument: the log is
append-only, so a marker you fail to reserve before history accumulates is *impossible to add
later without an ambiguous journal* (ADR-0010:95-97, 168-169). The registry is the **peer
object to `issuer`**: ADR-0011's G4 is explicit that `issuer` (who stamped) and `seamAuthority`
(who authorized this host to stamp) are two axes — "attribution ≠ authority" recurring one level
up (ADR-0011:137-141). If reserving the `issuer` half of that pair now is retrofit-mandatory,
then reserving the **shape and home of the `seamAuthority` half** is the same discipline, not a
separate indulgence. (a) is the concrete discharge of P-3 (`seamAuthority` reserved), which
ADR-0011 already lists as a hard enforcement precondition (ADR-0011:251, 305).

**Prop 2 — (a) is the exact DATA the ISO-2 boundary reads the moment uid-split lands, and that
trajectory is already ratified.** ADR-0011 is `approved`: direction ISO-2→ISO-3, gateway
`agents-manager` M3 = the first out-of-process caller of `engine.write()` (ADR-0011:62-65,
91-94, 303). ADR-0011's whole thesis is that A (trusted channel) "перестаёт быть theatre
естественно" — stops being theater naturally — the moment a real process boundary exists and the
host stamps across it (ADR-0011:183-184, 303). A registry of *which hosts the engine will honor a
stamp from* is precisely the table that boundary consults. Reserving it inert now means the
boundary, when it lands, reads a schema that already exists rather than one someone must design
under M3 deadline pressure. This is not defense-in-depth theater; it is **pre-positioning the
data structure on the far side of a boundary the project has committed to build.**

**Prop 3 — A concrete artifact can be frozen and observed; a prose intention cannot.** The
project has a *reviewer-PASSed precedent* for exactly this: `ports/principal-{resolver,stamper}.ts`
were committed as paper-freeze — schema-shaped, zero call-sites, zero enforcement, 187/187 green
(ADR-0010:224, ADR-0011:309). An inert `seam-authority-registry.json` + loader stub is the same
move for the root of trust. It buys two things prose cannot:
  - a **unit-freezable schema** — the subject shape, `maxTrust` ceiling, and revoke-not-delete
    semantics get pinned and tested *while they are cheap and while nothing is journaled against
    them*, not sketched as sentences that drift;
  - a **canary** — "can the `agent-uid` write this path?" run against the fixed home
    (`$FF_ENGINE_HOME/trust/`) **empirically dates** when the isolation boundary starts biting.
    Today at same-uid the canary is expected RED (agent *can* write it) — which is the honest,
    *observable* signal that P-5's "write-channel disjoint" clause is not yet satisfiable, instead
    of that fact living only as prose that can rot.

**Prop 4 — Machine-checked gates beat prose gates, and this project has a proven prose-rot
incident.** The pult/HANDOFF asserted "Stage-1 uncommitted" for a session *after* the merge
(commit `3474cd1`) — the FORK-1 drift: a precondition sentence and on-disk truth diverged silently
for a whole session (FORK-decision4 §Refinement, lines 137-150). A concrete registry lets P-5 be a
**tripwire that fails the build if any enforcement path exists while the registry is empty** —
converting "a sentence someone must remember" into "a build that goes red." Pure prose-(c) cannot
be tripwired; there is no artifact to check against.

**Net:** the strongest (a) is not "a wall." It is a **reserved, inert, testable data structure +
a canary + a machine-checkable gate**, riding ADR-0011's already-ratified boundary trajectory and
ADR-0010's already-accepted retrofit discipline.

---

## 2. Rebuttal to the same-uid false-closure objection

The refutation (FORK-decision4 §0, lines 24-36): engine and the `claude -p` child share ONE OS
uid, in-process (ISO-1 today), so a filesystem/registry boundary between them is *convention, not
enforcement* — the agent could write the registry too. Adopting (a) "now" therefore books a
guarantee ("agent can't write the registry") that is false at the moment of adoption — the RT5
false-closure pattern, one layer up.

**The rebuttal has three moves.**

**Move 1 — Concede the target, deny it is (a)'s claim.** The objection is *correct against
"(a)-as-live-enforcement."* The steelman does not defend that. It defends **"(a)-as-reserved-data
with an honest `unverified` floor."** In that framing the security property "agent can't write it"
is **not asserted today** — it is *scheduled* for uid-split and *made observable in the meantime*
by the canary (Prop 3). A registry that ships empty, with every stamp still reading
"seam authority not vouched," closes nothing and therefore cannot be *false*-closure. False-closure
requires a closure claim; reserved-inert (a) makes none. The objection defeats a claim (a) is not
required to make.

**Move 2 — Symmetry with form ②: nobody calls reserving `PrincipalAssurance` "false-closure."**
Form ② sits in `types.ts` today with zero enforcement — an "authenticated principal" envelope with
no authenticated principal anywhere (ADR-0010:122-124). By the same literalism it is
"a form whose security property is false at the moment of adoption." The project ratified it anyway,
because *reserving a retrofit-impossible shape is not the same act as claiming it enforces.* The
registry schema is the same category of object. If reserving ② is disciplined foresight, reserving
(a)'s schema inert is the same discipline — **the false-closure charge proves too much; applied
consistently it would also condemn ②, which the owner already approved.**

**Move 3 — Under ISO-2 the teeth are real, and ISO-2 is ratified direction, not hypothesis.**
The objection's "convention not enforcement" is a statement about *ISO-1 today*, not about the
approved *destination*. ADR-0011 (approved) says the gateway M3 out-of-process instance is the
first real boundary and that A becomes genuinely enforcing there (ADR-0011:79-80, 110-113). At
uid-split the registry stops being convention: the engine-principal owns `$FF_ENGINE_HOME/trust/`,
the agent runs as a different uid across an IPC boundary, and "honor a stamp only from a host in
this table" is kernel-enforced, not honor-system. So (a) is not permanently theater; it is theater
*for exactly the interval ADR-0011 already brackets as pre-M3*, and it is the data the post-boundary
engine reads. **The objection's true content is "don't *populate* it before uid-split" — which is a
statement about the population GATE, not about whether to reserve the schema.** And on the gate,
(a)-reserved and (c) agree completely.

**Where the rebuttal must stop being greedy (honesty clause):** Move 3 does *not* buy "populate
now." Seeding a host as legitimate behind a boundary that does not yet exist certifies a host known
to double-stamp (gateway-dup) with no real containment — that is genuine false-closure and the
steelman concedes it entirely. (a)'s teeth are *conditional on uid-split + P-2 fix*, exactly the
sequencing (c) prescribes. So the honest (a) is: **reserve the object now, populate only after
uid-split ∧ P-2.** Which raises the real question of §3.

---

## 3. Where (a) beats (c) — and where "(a) = (c) with the schema pre-reserved" is true

Read the fork's own text and the two options **converge on one physical object**: FORK-decision4
§0 line 33 ("A's registry file and C's `policy:seam-authority` node are the same object seen from
two sides") and §1 move 2 line 50 ("Physical home when populated = option A's §2 placement …
A is absorbed as the mechanism's form"). The §Refinement then commits **A's inert artifact +
loader + machine-checked gate** as the way to *execute* C (lines 121-150). Stated plainly:
**the winning synthesis already adopted (a)'s artifact; it labeled the package "(c)."**

Given that convergence, "(a) is really just (c) with the schema pre-reserved" is **substantially
true** — and it is (a)'s strongest position, not a concession. The remaining daylight, where the
concrete-object framing (a) *beats* the prose-mechanism framing (c):

| Dimension | Pure (c): name mechanism, defer content | (a): reserve concrete inert object |
|---|---|---|
| Schema (subjects, maxTrust ceiling, revoke-not-delete) | prose, unpinned, decided later under M3 pressure | pinned + unit-freezable now, while cheap and nothing journaled |
| Placement (`$FF_ENGINE_HOME/trust/`, engine-principal-owned) | described in prose | fixed on disk, canary-testable |
| Dating the boundary | asserted in §2 prose ("teeth arrive at uid-split") | **empirically observable** via write-canary — fact, not claim |
| P-5 gate | prose precondition — *demonstrably rot-prone here* (FORK-1) | machine-checked tripwire; build goes red on violation |
| Retrofit cost of the schema | rises once history/enforcement exists | ~0 now (peer to ② discipline) |

(a) beats (c) on **concreteness and observability**: a schema you can freeze, a home you can probe,
a gate a compiler enforces. These are the same virtues that made paper-freeze ports and reserved
form ② worth committing. Prose-(c) leaves all of them as intentions — and this project has a
receipt (FORK-1) showing its intentions rot.

---

## 4. Where (a) is genuinely WEAKER than (c) — the exposed flank

An honest steelman names where its own side loses. Four places:

**W1 — (a)'s headline guarantee is empty, and (a) invites people to believe it anyway.** "Registry
not writable by the agent" is the natural sales pitch for (a), and it is *false* at same-uid. (c)'s
framing ("name mechanism, honest `unverified` floor, defer content") never tempts anyone to believe
a guarantee that isn't cashable. (a) has to *actively suppress* its own headline to stay honest —
that is a real ergonomic weakness. A reader who sees a `seam-authority-registry.json` on disk may
reasonably assume it *does something*. (c)'s prose cannot be misread as live enforcement.

**W2 — (a) alone omits the GATE; (c) supplies it.** (a) as a bare artifact does not, by itself,
stop enforcement being flipped while the registry is empty. The safety comes from **P-5** — the
precondition that flip ③ cannot go green until the root is named, populated, and write-channel-
disjoint (ADR-0011:326-334). That gate is (c)'s contribution (FORK-decision4 §1 move 3). (a)
*without* P-5 is worse than (c): it is a plausible-looking artifact next to a flip switch, which is
the premature-flip false-closure the critic flagged. So (a) is only safe *wearing (c)'s gate* —
which is why the honest package is "(c)-with-(a)'s-object," and why calling it "(a)" overstates
(a)'s self-sufficiency.

**W3 — (a) answers WHERE, never WHENCE.** ADR-0011's own honest-limit clause is decisive here: the
field/registry "отвечает 'куда положить ответ', не 'откуда ответ берётся'" — where to store the
answer, not where the answer comes from (ADR-0011:312). (a) is storage. It does not solve
governance of the seam owner (OQ-1), TOFU-rejection (owner must seed manually, not
trust-on-first-use), T-seed (is the owner's write channel *really* disjoint from the deploy tree
the gateway runs from?), or T-scope (project- vs platform-scoped). (c)'s explicit deferral
*foregrounds* these as unsolved and routes them to a critic pass before P-5 may go green
(FORK-decision4 §3, lines 92-95). (a)'s concreteness can create false comfort that the hard part
is done when only the easy part (schema) is.

**W4 — (a) costs «строй»; pure-(c) stays paper.** Committing even an inert artifact is code-on-disk,
and the doc-tree rule «на диск — только по явному "строй" владельца» applies without exception
(FORK-decision4 §Refinement, lines 155-162). Pure-(c) can be ratified as text today, this session,
zero owner build-gate. So on *pure sequencing under the current DESIGN freeze*, (c) is strictly
cheaper to adopt right now; (a)'s object waits for a «строй» that hasn't been given.

---

## 5. Reversibility — what (a) costs if wrong

Low, *provided it is reserved-not-populated*.

- **Inert artifact:** empty `seam-authority-registry.json` (`subjects: []`) + loader stub with zero
  call-sites and zero enforcement path. Nothing reads it into a decision; nothing is journaled
  against it. Rollback = delete two files. Fully reversible, symmetric with the paper-freeze ports
  precedent (187/187, reviewer PASS).
- **The one irreversible move (which (a)-reserved does NOT make):** journaling a stamp at
  trust > `unverified` *vouched by* the registry, before uid-split + P-2. That poisons the
  append-only log permanently. This is exactly what P-5 forbids, and the steelman *requires* P-5.
  So (a)-reserved's irreversibility surface is **zero**; the irreversibility lives entirely in
  premature *population*, which both lenses gate identically.
- **Cost-if-wrong:** if the isolation model changes (e.g. ISO-1.5 capability-in-process, or a
  different boundary granularity, OQ-3), a reserved empty schema is discarded at the price of two
  deleted files and a schema decision that turned out unused. That is cheaper than being wrong the
  *other* way — reaching M3 with no reserved home and having to retrofit a `seamAuthority` shape
  against an already-accumulating journal, the precise retrofit-impossibility ADR-0010/0011 exist
  to prevent.

**Reversibility verdict:** (a)-reserved is cheap to be wrong about; only (a)-populated is not, and
the gate that both lenses share removes that surface.

---

## 6. Verdict in one line

**Adopt (a) as reserved, inert DATA — the concrete schema, fixed home, canary, and machine-checked
P-5 tripwire — but only wearing (c)'s honest `unverified` floor and population gate; framed that way
"(a) vs (c)" dissolves into "reserve the object, not just the intention," and the object wins on
every concreteness axis (freezable schema, observable boundary-dating, non-rotting gate) while
losing to (c) only in that (c) supplies the gate and the whence-not-where honesty that (a) alone
omits and pure-(c) can ship as paper today.**
