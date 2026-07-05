---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
---

# Documentation Convention — FF Personal Management

## The ONE rule
**Never delete — move to 90-historical.**
History is always preserved. A file is "gone" only when it has `Status: superseded` and lives in 90-historical.

---

## Group structure

```
docs/
  00-canon/       ← source of truth (approved decisions, ADRs, specs)
  10-synthesis/   ← deliberation outputs (SYNTHESIS, SWEEP, VERDICT, CONCEPT after council)
  20-analysis/    ← analysis artifacts (ANALYSIS, RESEARCH, DEEPDIVE, RATIONALE)
  30-plan/        ← plans and strategies
  40-dialogue/    ← design dialogue graph (THREAD nodes)
  60-raw/         ← immutable raw agent outputs per session
  70-ideas/       ← unvalidated ideas and research stubs
  80-examples/    ← reference data model examples
  90-historical/  ← superseded/stale docs (never deleted)
  99-qa/          ← validation records
  TREE.md         ← master index (this structure)
```

---

## Numbering convention

### Rule A — Logs and time-bound outputs → DATE prefix
**Format:** `YYYY-MM-DD-TYPENAME-topic.md`
**Applies to:** 10-synthesis, 20-analysis, 30-plan, 40-dialogue, 60-raw session folders, 90-historical.
**Read order:** most recent = most relevant (reverse-chronological).

Examples:
- `2026-06-23-SYNTHESIS-dogfood-schema.md`
- `2026-06-15-THREAD-foundation.md`
- `2026-06-24-HANDOFF.md` (in 90-historical)

### Rule B — Canon and decisions → SEQUENCE prefix
**Format:** `NN-TITLE.md` (two-digit ordinal by read/importance order)
**Applies to:** 00-canon top-level files only.
**Read order:** ascending (01 always first).

Examples:
- `01-STATE.md` — always first
- `02-DECISIONS-LOG.md` — second

### Rule C — ADRs → ADR sequence number
**Format:** `ADR-NNNN-title.md` (zero-padded 4 digits)
**Applies to:** 00-canon/ADR/ only.
**Read order:** ascending (0001 = foundational, higher = later).

### Rule D — SPECs → topic name
**Format:** `SPEC-topic.md`
**Applies to:** 00-canon/SPEC/ only.
Linked to ADRs in content, not by filename order.

### Rule E — Ideas and examples → topic name
**Format:** `IDEA-topic.md`, `TASK-topic.md`, short topic name
**Applies to:** 70-ideas, 80-examples.
Sorted alphabetically.

---

## When to add a parent vs a child

**New parent folder** = a new DOMAIN/SUBDOMAIN of the project emerges that has 3+ files of its own and doesn't fit any existing group.
- Example: if "integrations" grows to 5+ docs → create `25-integrations/` between 20-analysis and 30-plan.

**New child (subfolder within a group)** = a session-level folder in 60-raw, or a sub-namespace in 00-canon (ADR/, SPEC/).
- Example: `60-raw/2026-06-24-doc-tree/` — session folder inside raw.

**Rule:** never create a folder with only 1 file in it (except 60-raw session folders). Consolidate until there are 2+.

---

## Status lifecycle

All docs must have a `Status:` field in frontmatter or H1 header area.

| Status | Meaning |
|--------|---------|
| `draft` | Work in progress, not reviewed |
| `review` | Ready for owner review |
| `approved` | Owner has explicitly approved |
| `active` | Actively used as reference |
| `implemented` | Spec is implemented and validated |
| `superseded` | Replaced by a newer doc (link to replacement required) |
| `historical` | Old snapshot kept for record |

---

## Promotion path (idea → canon)

```
70-ideas/IDEA-topic.md
  → owner approves idea
  → 00-canon/SPEC/SPEC-topic.md (Status: approved)
  → implementation
  → 99-qa/VALIDATION-NNNN-topic.md
  → SPEC Status: implemented
  → 70-ideas stub: Status: superseded, moved to 90-historical
```

---

## What NOT to do

- Do NOT put raw agent output in 10-synthesis (raw → 60-raw only).
- Do NOT put unreviewed analysis directly in 00-canon.
- Do NOT rename or delete 90-historical files.
- Do NOT skip frontmatter Status field.
- Do NOT create files that mix two groups (e.g., a "synthesis that is also a plan").
