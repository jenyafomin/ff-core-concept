---
node_type: analysis
title: "Critic-before-done gate — СТРАТЕГ-ХЕНДОФФ (01-STRATEGY-HANDOFF.synthesis.md)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: critic
target: ../01-STRATEGY-HANDOFF.synthesis.md
---

# Critic-before-done gate: СТРАТЕГ-ХЕНДОФФ

Verdict: **DIRTY** — not signature-ready as-is. 3 CRITICAL, 2 CONCERN, 1 NOTED. Do not route to owner
until CRITICAL items are patched (cheap fixes, same class as the doc's own §1 gate).

## Critical (must address)

- **Broken relative paths — `lands_in` and every analysis `inputs:` pointer resolve to nothing.**
  — Lens: contradiction detection / factual check — Evidence: synthesis frontmatter `lands_in:
  ../../../plans/01-S1-ratify-two-laws/` resolves from
  `_shared/topics/05-strategy-path-and-next/synthesis/` via 3×`../` to `_shared/plans/...` — verified
  by `ls`: **no such directory**. Actual `plans/` lives at `docs/00-states/05-assemble-and-direct/plans/`
  (one level ABOVE `_shared/`, not inside it) — requires 4×`../`, confirmed by `ls ../../../../plans/01-S1-ratify-two-laws/` → real README/questions/work. Same off-by-one bug repeats in all
  four `analyses/*.md` frontmatter (`inputs: ../../../plans/INDEX.md` etc.) — this is a systemic error
  across the whole wave, not a typo in one file. The doc that's supposed to be the "жёстко отрезанный"
  pointer to where the next session lands doesn't point anywhere.
  — Failure scenario: next session (or owner) clicks/follows `lands_in` cold-start, hits a dead path,
  burns time re-deriving the real location — exactly the "read-8-files" friction the doc claims to
  eliminate.
  — Fix: `s/\.\.\/\.\.\/\.\.\/plans/\.\.\/\.\.\/\.\.\/\.\.\/plans/` in synthesis frontmatter + all 4
  analyses frontmatter.

- **§2 vs §3 direct self-contradiction on the cheap-policy security debt.**
  — Lens: contradiction detection — Evidence: §2 explicitly buckets it as deferred: *"Отложить (не
  несущее сейчас): cheap-policy security-долг (severity 🔴, но воронка есть)…"* (line 49-50). §3 Track
  A-2 then instructs fixing exactly those items *right now*: *"Починить 1-2 dev-only интегрити-бага
  (⭐ упущение, поймал критик — строится ПРЯМО сейчас, никого не ждёт): `T-write-pep-unwired` /
  `T-grant-forgery` / `T-policy-node-provenance`"* (line 58-60) — two of the three names
  (`T-grant-forgery`, `T-policy-node-provenance`) are the *same* items §2 just called deferred. Source-
  checked against `01-path-structure.analysis.md` §4 "Отложимое" — architect's own analysis puts these
  in the deferred bucket too. The synthesis picked up the critic's "provocation" (a *maybe*, not a
  recommendation — 04-adversarial.critic.md explicitly frames it as "Может быть скрытый быстрый win")
  and promoted it to a numbered Track-A deliverable without reconciling it against its own §2.
  — Failure scenario: owner reads §2, mentally files security debt as "not now," then reads §3 and sees
  it scheduled for immediate build — inconsistent signal, and it re-opens exactly the "next session
  secretly = 3 sessions" trap the doc claims to have closed (patch text = doc work; dev-bug fix = code
  work with its own test/verify loop; these are different session types).
  — Fix: either (a) drop Track A-2 from the mandatory Track-A deliverable list and demote it to a
  clearly-optional footnote requiring separate explicit "строй" *and* remove it from §2's deferred list,
  or (b) remove the §2 "Отложить" claim about cheap-policy debt if it's actually being picked up now.
  Currently both are true in the same document.

- **Track B item 3 ("ODIN decision-sheet") duplicates an artifact that already exists — `OWNER-MORNING-
  PACKET.md`, dated the same day, already covers exactly what's being proposed.**
  — Lens: missing perspective / doc-tree law-3 (consolidate first, don't build atop clutter) — Evidence:
  `docs/00-states/05-assemble-and-direct/_shared/OWNER-MORNING-PACKET.md` (mtime 2026-08-09 13:49,
  `status: active`) already contains all 8 decisions inline — суть·варианты·рычаг·нода·срочность, the
  *exact* format §3 item 3 asks for ("суть+варианты+рычаг прямо в тексте, БЕЗ «открой ещё 3 файла»") —
  including the same red-team caveat on Q-Law1/G1-scope-gaps (packet lines 36-43) that the synthesis's
  Track A-1 patch is meant to feed into. The doc's own input `02-value-leverage.analysis.md` names this
  file explicitly and says it's "already 90% ready" (line 47) — that finding was surfaced by a sibling
  lens and then dropped: the synthesis names the deliverable "ODIN decision-sheet" with no reference to
  `OWNER-MORNING-PACKET.md` at all, reading as new-artifact-from-scratch. This is the precise failure
  mode `.claude/rules/doc-tree.md` law 2/3 warns against ("Консолидируй ПЕРВЫМ ходом… не досыпать пакет
  поверх бардака") — and the doc otherwise cites doc-tree correctly elsewhere (§7).
  — Failure scenario: next session builds a second one-pager beside the first, owner now has two
  "read me first" decision sheets in `_shared/`, drifting out of sync as Q-G1-scope-gaps gets patched
  (which file gets updated? both? neither?).
  — Fix: Track B item 3 should read "update `OWNER-MORNING-PACKET.md` items #1-#2 with the Track-A-1
  patch outcome" — not commission a new sheet.

## Concerns (should address or accept)

- **§1's WIP-limit rule ("moved a gate or it didn't count") is unenforceable as written — and this very
  handoff (iteration 10) would fail its own test.** — Lens: contradiction detection / self-application —
  Risk if ignored: the rule's stated exception ("дверь для red-team не захлопываем") is prose, not a
  criterion — nothing in §1 tells a future session how to tell "legitimate red-team pass" (iter 7, which
  found 2 real gaps) from "iteration-11 death-by-design" before running it, only after. Under a literal
  reading, this strategy wave itself (iteration 10) closed zero forks, moved zero G-gate colors, and
  committed zero dev-bugs before it started — the same pattern `04-adversarial.critic.md` already flagged
  as its top CRITICAL ("Этот самый прогон… тоже не сдвинет ворота") and the synthesis doesn't answer that
  specific challenge, it just restates the rule. Fix: add an explicit ex-ante test (e.g., "permitted only
  if scoped to the exact document going to signature, capped at one pass, and stated up front as a
  red-team pass on a specific artifact — not a general strategy/analysis wave").

- **Q-Law2 routed into "wait for Track-A patch, then decide" without evidence it's actually blocked by
  that patch.** — Lens: assumption audit — Risk if ignored: minor owner-confusion, not a blocker. The
  Track-A-1 patch (Instance-1/Instance-4 of `two-laws.invariant-candidate.md`) is scoped to Q-G1-scope-
  gaps, which — per `OWNER-QUEUE.md:171-193` — concerns U-L1 (Law-1) instances specifically; nothing in
  the source cards ties Law-2's readiness to that same patch (Law-2's own open item is the operator
  question, explicitly deferred to S3, per `OWNER-QUEUE.md:43-47`). Grouping "Q-Law1 · Q-Law2 · Q-I4" as
  uniformly "wait for Track-A" may just be sharing the same file/pass rather than a real dependency — not
  verified false, flagging as PLAUSIBLE not CONFIRMED.

## What I looked for but didn't find problems with

- **Fork-name/anchor accuracy for the 5 🔴 forks and the C→A→B→D chain.** Cross-checked
  `plans/INDEX.md:52-59`, `plans/01-S1-ratify-two-laws/README.md`, and `OWNER-QUEUE.md` line-by-line
  against synthesis §2-3: Q-Law1/Q-Law2/Q-I4/Q-R4/Q-G1-scope-gaps are correctly the 5 red cards, S1=C /
  S2=A / S3=B / S4=D matches `plans/INDEX.md` exactly, F1/F2 names match
  `04-threat-model/synthesis/02-resolution.synthesis.md:33-35`. No fabricated anchors found (aside from
  the relative-path depth bug above, which is mechanical, not a naming error).
- **Fork classification (decide-ready-now vs need-work-first) in §3 Track B.** Matches the critic's own
  `04-adversarial.critic.md` "Concerns" list item-for-item (Q-F6-grain-A, Q-L1dom, Q-critical-faces-f3f4,
  Q-FORK-U3, Q-R3 as ready; Q-Law1/Q-R4/Q-I4 as needing more) — no smuggled owner-decision found; R4's
  classifier-gap and VIP-mechanism caveats are carried through faithfully, not resolved on the owner's
  behalf.
- **§4 standard deferral against the owner's explicit ask.** Owner's voice request
  (`strategy.question.md:20`, `:44-46`) does explicitly ask to "закрепить стандарт" — this is a real
  request, not invented. But the doc names the conflict openly (§4 header: "честно — против твоего
  первого запроса"), all 4 independent lenses converge on deferring (architect, business, abstract,
  critic all reach the same conclusion independently), and it's grounded in the project's own written
  rule (`evolution.md`: promotion requires evidence, not opinion — n=0 sessions run against the 3 existing
  conventions). This reads as a defensible, disclosed trade-off, not a dodge.
