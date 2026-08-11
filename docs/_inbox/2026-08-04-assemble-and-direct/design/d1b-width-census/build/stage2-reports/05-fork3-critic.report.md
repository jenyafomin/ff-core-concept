---
node_type: analysis
title: "Fork #3 (by-ref PII survives shred) — independent adversarial critique, second lens vs Fable-advisor"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
agent: critic
related:
  - ./04-wave-synthesis.report.md
  - ./03-runtime-verify.report.md
  - ../../../../../../packages/engine/src/core/erasure.ts
  - ../../../../../../packages/engine/src/adapters/store-durable-fs.ts
  - ../../../../../../packages/rental-balance/test/erasure-plane-falsify.test.ts
---

# Critique: Fork #3 — does the green §9-3 lie, and what's the cheapest honest fix

## Critical (must address)

- **The overclaim lives in the codebase, not just the verbal report — it will outlive this session.**
  Lens: contradiction detection. Evidence: `packages/rental-balance/test/erasure-plane-falsify.test.ts:9`
  says *"its payload PHYSICALLY shredded on disk"*, and the assertion comment at `:48` says *"the erasable
  payload zone is physically gone on disk."* Both are true only for the **inline** `erasable` record. The
  synthesis report (`04-wave-synthesis.report.md` §2 грань №3) already knows and states the narrower truth
  — but that's a session artifact under `docs/_inbox/`, easy to never re-read. The test file is the thing
  that survives, gets grep'd, gets cited in a future PR as "see, §9-3 proves payload erasure." A reader of
  the test six months from now, with zero synthesis-report context, will believe "payload" means *all of
  it*. This is exactly the failure mode `doc-discipline`/source-of-truth rules exist to prevent: the
  durable artifact (test comment) says more than what was proven.

- **The by-ref path — the one the code itself recommends — is precisely the one with zero erasure coverage.**
  Lens: assumption audit / contradiction detection. `erasure.ts:64-72` (`isErasureVerifiable`) argues by-ref
  storage is *better* than inline because it leaves a cryptographic witness (`payloadHash`) after erasure —
  "which is the concrete reason the seam recommends erasable content travel by-ref." But `shredPayload`
  (`store-durable-fs.ts:226-251`) only ever touches the inline `erasable` journal key; it has no notion of
  `payloadRef` or a blob store at all. So the storage mode the module's own docstring prefers is the one
  mode where "erase" currently does nothing. If ga-rentacar-style ingest (which already uses `payloadRef` +
  real PII blobs per `03-runtime-verify.report.md` §"boundary finding") is the intended production pattern,
  the erasure feature is inverted: the more compliant-by-design storage choice is the least erasable one
  in practice. That's not a missing feature, it's a load-bearing assumption (`isErasureVerifiable`'s premise
  that "shred the blob, keep the hash" happens) that nothing in the codebase currently implements.

- **`erasure.ts`'s own docstring is now stale relative to what the codebase actually does.** Lens:
  contradiction detection / source-of-truth Level D vs C. `erasure.ts:12-15` states the by-ref-vs-inline
  choice is "the genuinely irreversible owner call... deliberately NOT decided" here. But reality
  (Level D, executable) has already decided it: rental-balance's ingest path stores real PII (`name`,
  `phone`, `recentNote`) by-ref in `FilePayloadStore` blobs under `<storeDir>/payload/`. Per the project's
  own source-of-truth rule ("executable reality breaks ties... update either code or doc, do not leave
  inconsistency"), this doc is currently wrong about the state of the world — it describes an open
  question that has silently closed itself by accretion, not by decision.

## Concerns (should address or accept)

- **Deferring by-ref hard-erase quietly converts a design gap into a data-liability clock the moment real
  user data flows.** Lens: failure mode analysis / blast radius. Today's PII (`"Test Renter"`,
  `0501234567`) is synthetic fixture data — blast radius is zero. The trap is not today; it's the gap
  between "D1.b marked done, §9-3 green" and "by-ref hard-erase shipped." If any real-user onboarding,
  demo-with-real-data, or production rentacar ingest happens in that window, every PII blob written during
  it becomes **permanently unerasable by the existing mechanism** — there is no retroactive sweep, no
  cascade shred, no GC. Unlike F3 (WAL/atomicity, DEFER'd) or F5 (supersede-chain cascade, DEFER'd), which
  degrade an existing capability, this one is the *total absence* of a capability on the path the code
  recommends. Recommend: an explicit, boring guardrail — a one-line note in the ingest layer or a runtime
  assertion that by-ref payload stores are dev/test-only until the fork ships — cheaper than the fork
  itself, and it converts "we forgot" into "we knew and fenced it."

- **Blob accumulation has no retention story regardless of erasure semantics.** Lens: scalability stress
  test. `<storeDir>/payload/*.json` grows monotonically; nothing in this codebase paths ever deletes a
  blob (shredPayload doesn't touch it, and there's no independent GC). Not a privacy bug by itself, but at
  10x/100x ingest volume it's an unbounded-disk-growth risk sitting next to the same file. Worth a line in
  whatever fork tracks by-ref shred, not a new fork on its own.

## Provocations (consider)

- **Is "erasure" even the right word for what's shipped?** The green suite proves an *edges ⟂ inline-body*
  separability property — a structural/architectural fact about the journal format. It does not yet prove
  anything about *erasure of personal data* as a real-world capability. Worth asking whether §9-3's name
  should be split: keep "§9-3 inline zone shred" as the architectural claim that's actually proven, and
  name the PII-erasure claim something that stays visibly red/pending (`§9-3-PII-BYREF: NOT YET PROVEN`)
  until the fork lands — so the census/wave-synthesis machinery this project already uses (falsify-before-
  fix, green=genuinely-earned) applies the same discipline to the *label*, not just the code.

- **Second independent lens (Fable-advisor) is looking at the same fork without coordination — worth
  comparing verdicts before the owner decides**, since a split verdict (e.g. Fable says "ship as-is,
  by-ref is out of scope" vs this critique's "the label is actively misleading") is itself useful signal,
  not noise. Recommend the lead read both before opt-in, per the task framing.

## Noted (watch)

- `store-durable-fs.ts`'s own docstring for `shredPayload` (lines 214-224) is honest and well-scoped — it
  never claims more than "strip the ERASABLE payload zone of the journal line," and explicitly calls out
  F3/FORK-2 as separate deferred grains. The adapter code is not where the overclaim lives; the test-file
  prose and the stale erasure.ts docstring are. Don't over-rotate onto "the code is misleading" — it's
  specifically the two comment sites above.
- FORK-2 (only first occurrence of `actId` shredded in a supersede chain) compounds with by-ref: even if
  by-ref hard-erase ships, a supersede chain would still leak old blobs. Not urgent now (both are DEFER'd),
  but they should probably be scoped as ONE fork ticket, not two, since fixing by-ref shred without also
  fixing cascade leaves the same "believed erased, actually not" gap one level down.

## What I looked for but didn't find problems with

- **Reviewer/runtime-verify's core claims (§9-3 edges⟂payload, cross-process, mutant-red).** Re-read
  independently — the byte evidence in `03-runtime-verify.report.md` §3 (`erasable` key fully removed,
  `payloadRef`/`payloadHash`/`edges` byte-identical) is solid and not in question here. This critique is
  scoped entirely to the *labeling* of what was proven, not the proof itself.
- **Whether `IMMUTABLE_ACT_META` including `payloadRef`/`payloadHash` is itself wrong.** It isn't — keeping
  the hash as a post-erasure witness is a sound design *if* the blob actually gets shredded eventually.
  The design is fine; only its current, partial implementation state is misrepresented.

---

## Verdict (compact)

**Does the green lie?** Not the adapter code — but yes, two specific comment sites do: the test file's
own docstring/assertion prose (`erasure-plane-falsify.test.ts:9,48`) and `erasure.ts`'s module docstring
(lines 12-15, now stale). Both say or imply "payload gone" where only the inline non-PII zone is gone; the
actual PII (by-ref blob) is untouched and — per the module's own reasoning — by-ref is the *recommended*
storage mode, meaning the least-covered path is the one meant to be used. Severity: not a security hole
today (fixture data only), but a **latent compliance/trust liability** the moment real PII flows before
the fork ships, wrapped in wording precise enough to survive a skim as "erasure ✅."

**Cheapest honest fix (no new erase logic):** rewrite the two comment sites above to say "inline erasable
zone" instead of "payload," and correct `erasure.ts`'s "not yet decided" line to reflect that by-ref is
already in use in practice — zero new code, ~10 minutes, removes the overclaim at its two durable sources
(not just the ephemeral synthesis report).

**Risk of deferring by-ref hard-erase itself (not just the wording):** acceptable *only* while all PII
routed by-ref stays synthetic/dev fixture data. The moment that stops being true, the gap becomes an
unrecoverable-by-design liability (no retroactive sweep exists). Recommend pairing the fork ticket with an
explicit "dev/test-only" fence until it ships, not just a backlog item.

**Over-proof line:** full GDPR-grade hard-erase (cascade shred, WAL-ordered rewrite, blob GC) is
legitimately out of scope for D1.b's mandate (prove the plane is genuinely falsifiable) — that's Stage
3+/its own ADR-worthy epic (storage/erasure semantics = architecture-class change per this project's own
ADR discipline), not something to build under schedule pressure from a wave-synthesis gate.
