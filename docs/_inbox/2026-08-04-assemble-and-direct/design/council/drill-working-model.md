---
node_type: design
lens: working-model
title: "Working model of movement — the relay machine (истинное движение)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-05
topic: assemble-and-direct
seed: ../../../../_log/2026-08-05-depth-and-path/HANDOFF.md  # §2 owner's model
related:
  - ../01-execution-plan.synthesis.md  # §3 S-D: pult→graph, STATE-as-index, harvest-gate
  - ../../../../00-states/05-assemble-and-direct/state.md
---

# Working model of movement — the relay machine

> Turns the owner's §2 seed into a concrete operating model. This is METHOD (how sessions chain),
> not content. It IS the first materialization of direction S-D.

## 1. MODEL-NAME (the invariant that makes it work)

**Movement lives in the BATON, not in the runner.**
A branch advances only as far as its pre-painted exchange line (gate) per leg; a session that
ends without passing the baton (handoff) = movement lost. Corollary, inherited from the plan's
governing invariant: **a card's status is DERIVED from its last harvest, never declared.** A branch
is only as alive as its last handoff.

Analogy: STATE is a **dashboard generated from meters, not a diary**. Branch = a lane. Session =
one runner's leg. Handoff = the baton. Gate = the finish-line painted *before* you run, so you
never sprint past the exchange zone.

## 2. TYPE-GRAPH (clean types + edges)

| Type | Definition | Lives in |
|---|---|---|
| **task** | Smallest unit of intended change (atom). Has: status, origin, belongs-to-branch. | `_shared/task-pool.md` |
| **plan / branch** | One coherent line of work = ONE card. Has a pre-declared gate (right-point) + one home folder. | a card in generated `STATE.md` |
| **session** | One working turn / one chat, bounded by a small context budget. Drills exactly ONE branch. | ephemeral |
| **handoff** | The trace that CLOSES a session and OPENS the next. The only thing the next session must read to start. | `_log/<date>/HANDOFF.md` |

**Edges:**
- task **belongs-to** branch (1..N) · task **origin-from** {council-finding · drill · fork · carry-forward}
- branch **is-card-in** STATE (generated) · branch **seq/parallel** branch
- session **drills** exactly-one branch · session **moves-status-of** tasks
- session **emits** handoff · handoff **points-to** {state, branch, next-entry-task}
- handoff **harvests** done-tasks → **derives** card status (never hand-typed)

**How STATE "self-fills":** the machine's *exhaust becomes its fuel.* Every session's harvest deposits
new tasks (findings, drilled sub-items, fork-spawn, carry-forward) back into the task-pool, each
**tagged with a target branch**. STATE is not written by hand — it is **generated** from cards, whose
task-lists are read from the pool. Tasks arrive from four mouths only: council findings (e.g. HANDOFF
§3 is already such a pool), plan-driller sub-items, owner forks, and unfinished carry-forward.

## 3. THE-LOOP (one turn of the machine) + STOP-RULES

1. **Enter** — read the handoff only. It names: the branch, the entry task, the small read-first set.
2. **Pick** — exactly ONE branch. Its gate (right-point) is already written in the card.
3. **Shallow work** — advance tasks toward *that gate only*. Do not deepen past it.
4. **Harvest** — write the handoff: what closed, what new tasks spawned (into pool, tagged), the next
   entry. Card status flips **only** via generator/verification output.

**STOP-RULES (the "right point for this pass", decided BEFORE diving):**
- **S1 — gate reached.** The branch's pre-declared gate for this pass is the finish line. Stop there.
- **S2 — context budget hit.** Small-context is a hard wall; bank progress via handoff.
- **S3 — out-of-lane discovery.** A question outside this branch's gate → **deposit as a task in the
  pool, do not chase it.** Curiosity does not extend depth; the painted gate does.

Because the gate is written *before* the dive, "how deep" is a decision, not a discovery — this is
what stops drowning.

## 4. FAILURE→ENFORCEMENT (how it rots → the one check that stops each)

| Failure mode | Enforcement (generator-level, not prose) |
|---|---|
| Cards stuck `active` forever (rot) | Generator **flags any `status:active` stale past a threshold** (D0 anti-rot check). |
| Tasks orphaned (no branch) | Pool schema **requires `belongs-to`**; generator lists untagged as `needs-home`, rejects merge. |
| Handoffs lying ("done" ≠ real) | **Harvest-gate:** card status is DERIVED from the handoff's harvest via verification output; **generator rejects a hand-typed status** (plan D1.c). |
| STATE hand-edited → drift | Root `STATE.md` **generated** from cards; teams edit **only their own card frontmatter** (D0 enforcement-a). |
| Session sprawl (many branches, big context) | **One-branch rule:** handoff must name exactly ONE entered branch; more branches = more sessions. |
| Pool bloat / never harvested | Handoff template **forces harvested/spawned/carried columns**; a session must close or re-tag ≥ its entry task. |

## 5. SMALLEST-FIRST-STEP

**Not the full S-D0 skeleton.** The load-bearing organ is the **baton** — build it first, before the
generator:

1. Create `_shared/task-pool.md` — seed = HANDOFF §3 (already a pool). Each task: `id · status ·
   belongs-to-branch · origin`. This makes "self-fill" real by hand today.
2. Create `HANDOFF.template.md` — the **harvest contract**: `entry-branch · gate-for-this-pass ·
   harvested / spawned / carried · next-entry`.

These two files make the loop runnable next session with zero code. **STATE-index generation (D0) is
step 2**, not step 1 — the model works on discipline first, mechanizes second.
