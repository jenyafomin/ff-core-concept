---
node_type: analysis
title: "CG-12 finding — D0's 'generated root STATE.md via doc-tree.mjs' does not exist in code"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
related:
  - ../01-execution-plan.synthesis.md
  - ./00-coorch-framing.md
  - ../../../../../../tools/lint/doc-tree.mjs
  - ../../../../00-states/04-improvement-plans/state.md
source:
  - tools/lint/doc-tree.mjs
  - docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md
  - docs/_inbox/2026-08-04-assemble-and-direct/design/polosa-a/00-coorch-framing.md
---

# CG-12 finding — D0 generator claim vs code reality

## (A) Код-факт (якорь)

`tools/lint/doc-tree.mjs:5` (comment, describes the script's contract):
> `// Запуск: node tools/lint/doc-tree.mjs  → пишет docs/_generated/doc-tree.view.md + сводку в stdout.`

`tools/lint/doc-tree.mjs:82-83` (actual write call):
```
mkdirSync(join(ROOT, '_generated'), { recursive: true });
writeFileSync(join(ROOT, '_generated', 'doc-tree.view.md'), header);
```

`tools/lint/doc-tree.mjs:64` (header the file actually contains):
> `'# 🌳 doc-tree.view — генерируемое дерево docs/ (авто-вид)',`

The script's job (per `classify()` at `tools/lint/doc-tree.mjs:15-22` and `render()` at `:37-59`) is to
walk `docs/`, tag every folder with an archetype (`numbered/plural/service/dated/named`), and flag folders
with too many loose files (`:47`, `:50`). **It does not read or emit** `id`, `theme`, `gate`, `home`,
`handoff`, or `value-checkpoint` fields anywhere in the file — grep for these terms inside
`tools/lint/doc-tree.mjs` returns nothing.

Confirmed independently: `docs/STATE.md` does not currently exist (`ls docs/STATE.md` → no such file), and
no root card-index in the D0 schema exists anywhere in the repo. **CONFIRMED: the plan's D0 generator claim
is false.** `doc-tree.mjs` writes a tree-shape *view*, not a root status *pult*.

## (B) Ложные строки плана (было)

`docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md:98`:
> `| **D0** | Harness skeleton (generated pult + harvest gate) | `00-states/05-assemble-and-direct/` (meta-state produces it) | Parallel W1; gates **only D1.c** |`

`…01-execution-plan.synthesis.md:116-118`:
> `- **Right-point:** root `STATE.md` is a **generated** index (schema: id·theme·status·gate·home·handoff·`
> `  value-checkpoint·fork?); the 4 unregistered branches (ga-rentacar, durable-store, picture-coverage,`
> `  assemble-and-direct) registered as cards; the **HARVEST/CLOSE gate documented as a RULE**.`

`…01-execution-plan.synthesis.md:119-122`:
> `- **Enforcement (not prose):** (a) root `STATE.md` **generated via existing `tools/lint/doc-tree.mjs`** —`
> `  teams edit **only their own card's frontmatter**, never the root table (kills the append-stack merge-rot);`
> `  (b) a generator check that **flags any `status: active` card stale past a threshold** (the anti-rot`
> `  mechanism, not a label).`

The load-bearing lie is `:119`'s **"via existing `tools/lint/doc-tree.mjs`"** — present tense, claims the
capability already exists. It does not (§A).

## (C) Патч (стало) + выбранный исход

**Chosen outcome: (a) — keep the false claim out, name an owner+sizing task for extending the generator.
Not outcome (b) (bare honest rewrite with no task).**

Reasoning: D1.c (`:153-157`) is *architecturally dependent* on a machine-checkable card generator existing —
its own enforcement line reads "**card generator rejects a hand-edited status on this row**"
(`…01-execution-plan.synthesis.md:157`). If we only patch D0's text to "todo, not generated" (outcome b)
without opening a task, D1.c's gate becomes permanently unsatisfiable prose — reintroducing exactly the
"prose-only gate" failure the plan's own KILL-SHOT 2 (`:43-45`) forbids. So the honest fix must also carry a
sized, owned task — outcome (a).

**Patch to `:116-122`** (replace):
```
- **Right-point:** root `STATE.md` is a **generated** index (schema: id·theme·status·gate·home·handoff·
  value-checkpoint·fork?); the 4 unregistered branches (ga-rentacar, durable-store, picture-coverage,
  assemble-and-direct) registered as cards; the **HARVEST/CLOSE gate documented as a RULE**.
- **Enforcement (not prose):** (a) **TODO — no generator exists yet.** `tools/lint/doc-tree.mjs` today only
  emits a tree-shape view (`docs/_generated/doc-tree.view.md` — folder archetype + loose-file flag; verified
  `tools/lint/doc-tree.mjs:82-83`); it does not read/write `id/theme/gate/home/handoff/value-checkpoint`.
  **New sized task: "extend `doc-tree.mjs` (or add a sibling mode in the same file) to also emit a root
  card-index pult from card frontmatter."** Owner: TBD (process/librarian lens, same team as D0 per plan
  `:126`). Sizing: S (one script extension + fixture cards), blocks D1.c only, does not block D1.a/D1.b
  (`:205` unaffected). **Task must include, as an explicit acceptance step: the schema
  `id·theme·status·gate·home·handoff·value-checkpoint·fork?` quoted at plan `:117` is UNVALIDATED — it was
  never checked against a real card's frontmatter and must be RE-DERIVED from the actual proven-pattern
  card, `docs/00-states/04-improvement-plans/state.md:1-11`, whose real frontmatter fields are
  `id, node_type, theme, status, owner, opened, updated, agents, handoff, last_session, plans` — no `gate`,
  no `value-checkpoint`, no `home` field exists there. The task is not "wire up doc-tree.mjs to the `:117`
  schema"; it is "derive the pult schema from real cards, THEN wire up doc-tree.mjs" — otherwise the
  generator ships against a schema no card actually has.** Until this task lands, D0's "generated pult" is
  **not-yet-real** and D1.c stays gated on it exactly as `:153`/`:205` already say — no change needed there,
  only to the false present-tense claim.
  (b) a generator check that **flags any `status: active` card stale past a threshold** (the anti-rot
  mechanism, not a label) — same open dependency: this too needs the not-yet-built generator; fold into the
  same sized task rather than a second one.
```

**Patch to `:98`** (table row, replace "generated pult" with "pult — todo, sized task open" or equivalent
status marker) so the overview table doesn't repeat the same false present-tense claim.

No other lines require a patch: `:153-157` (D1.c) and `:205` (`D0 → D1.c` edge) already correctly describe
D1.c as *depending on* D0's pult — they do not themselves claim the generator exists, so they stay as-is;
they simply now depend on a named open task instead of a phantom already-built one.

## (D) Заметка общего дома с И3 (CG-13)

`00-coorch-framing.md:79-82` already flags this: CG-12 (no root pult) and CG-13 (no generator-check census)
both point at the same tool-candidate `tools/lint/doc-tree.mjs`. Per doc-tree.md law 2 ("один дом на
тему/разбор") **this task's proposed sized task and И3's generator-check must target the SAME file**
(`tools/lint/doc-tree.mjs`, extended with a new mode/flag), not two independent new generators. Explicit
flag for harvest: if И3 also proposes "build a generator," the harvester must merge the two proposals into
one sized task with one owner, not two parallel scripts reading/writing overlapping schemas. Per
`00-coorch-framing.md:61-62`, И3's first slice should read `task-pool.md` / `02-coverage-gate.synthesis.md`
directly and NOT wait on this task's card-index schema — so the two are parallel-safe short-term, but their
long-term generator home must converge to one file.

## (E) Риски для критика

- **R-scope:** this finding proposes a task, not code. If the critic finds any file under `tools/` or
  `packages/` was touched, that is a rule violation — verify no such diff exists (I2 read-only this task).
- **R-owner:** "Owner: TBD" is a placeholder per instructions (do not silently assign a real name) — the
  critic should not accept this finding as "owner determined," only "owner slot opened, needs owner fork or
  assignment by the harvester/owner."
- **R-schema:** the D0 schema string `id·theme·status·gate·home·handoff·value-checkpoint·fork?` (plan `:117`)
  does not match the real "proven pattern" card frontmatter (`04-improvement-plans/state.md:1-11`). This is
  now folded into the §C patch itself (task acceptance step: re-derive schema from real cards before wiring
  the generator) — not left as a side-note, per critic's REVISE.
- **R-outcome-boundary:** confirm the patch text nowhere slips into outcome-(c) ("I'll quickly write the
  generator now") — it explicitly says "not executed now," sizing S, as a future task.

## (F) Крючки самопроверки

- [x] Read `tools/lint/doc-tree.mjs` in full (87 lines) — confirmed single write target `docs/_generated/doc-tree.view.md`.
- [x] Grepped `tools/lint/doc-tree.mjs` for `id|theme|gate|home|handoff|value-checkpoint` — zero matches.
- [x] Confirmed `docs/STATE.md` does not exist on disk.
- [x] Quoted every plan line mentioning D0/doc-tree.mjs/pult verbatim with line numbers (`:98`, `:116-118`,
      `:119-122`).
- [x] Confirmed D1.c (`:153-157`) and the `D0 → D1.c` edge (`:205`) do not themselves assert the generator
      exists — no patch needed there.
- [x] Did not edit `tools/lint/doc-tree.mjs` or any file under `packages/`.
- [x] Cross-checked overlap note against `00-coorch-framing.md:79-82` and `:61-62` — consistent, not
      contradicting the co-orchestrator's framing.
- [x] Schema mismatch (plan `:117` vs `04-improvement-plans/state.md:1-11`) folded into §C's sized-task text
      as a required acceptance step (critic REVISE, applied) — not left as a side-note in §E only.
- [ ] NOT verified: whether the council already knew about this schema mismatch before this finding — flagged
      as open provenance, not resolved here (out of CG-12's scope).
