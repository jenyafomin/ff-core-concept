# Critic review — SPEC-brain-data-doors (2026-10-09)

## BLOCKERS
**B1. Grammar `sys:<id>/<n>` contradicts R1 spec.** R1 seeds `sys:prompt-layer`, `sys:target`, `sys:lens`, predicate `sys:applies-to` (no `/`), written by `sys:brain` and `sys:gateway`. Under R-1.2/1.3 all are rejected (no `<id>/`; "prefix = writer id" fails: `prompt-layer`≠`brain`). R1 depends on doors 1+2, so the first `sys:` set dies at the door.
Patch R-1.2/R-1.3: grammar `sys:<n>` (flat) **or** `sys:<id>/<n>`; rule: `sys:` names accepted from any `sys:*` writer (sys/pack distinguished by trust only, per ADR-0017 D1 "reserved"); `pack:<id>/<n>` stays writer-bound. Add AC: `sys:prompt-layer` from `sys:brain` accepted, from `pack:x`/`user:` rejected. Or amend R1 names to `sys:brain/prompt-layer` (pick one NOW; rename after data = rewrite).

**B2. Rejected def still poisons the graph (V3).** Rejection happens in the registry fold only; the engine projection folds every act. `typeDefId(name)=typedef:<name>` (genesis.ts:90), so rejected `task@2` from `user:owner` is a freshest-wins write onto node `typedef:task` — the core type node's body is overwritten while `registry.type('task')` still says v1. `read`/`find` then disagree with registry. AC-D04 checks only the registry. §9's "acceptable while no real data" doesn't hold: the data is the journal itself.
Patch: enforce at write too (`validate-act`/`planRecord` rejects forbidden def acts BEFORE append — new writes never enter the journal), keep fold-time check only as legacy/appendRaw defense. Add AC: after rejected `task@2`, node `typedef:task` payload unchanged (snapshot).

**B3. `foldAct(act)` has no actor.** Signature is `Pick<Act,'actKind'|'payload'>` (registry.ts:108); `scanJournalRegistry` passes only those. R-1.3 needs `actor`. Patch R-1.4/R-1.8: codec returns whole Act; `foldAct` takes `actor`; pass 1 and runtime fold share one path (else `rejected[]` counted twice → duplicate friction; specify dedup key = act id).

## MAJOR
- **M1. Alias splits identity on version bump.** New def `u:idea` v2 gets node id `typedef:u:idea` ≠ legacy `typedef:idea`. R-1.5 fixes only `instance-of` targets. Require `buildTypeDefAct` to use `registry.defNodeId`. Same for predicates (`pred:`).
- **M2. Predicate alias duplicates edges.** `edgeIdOf` includes the predicate; re-linking after upgrade writes `u:lives-in` next to legacy `lives-in` — two edges for one fact. Read/find predicate filters (`lives-in`) won't match `u:lives-in`. Spec touches write paths only. Add AC: lookup/filter by either spelling returns both; link dedups across spellings.
- **M3. Option A is safe only if exhaustive.** Public API changes: `record{type:'meeting'}` now returns `u:meeting`; `find{type:'meeting'}` must canonicalize. Spec lists 4 assertions found by name; require `npm test` full run to enumerate failures, update only assertions (also brain-mcp, bench, engine day-scenarios), list each in the PR. Safe otherwise.
- **M4. `v` collisions.** Acts carry unknown fields (AC-D17); an act with own top-level `v` collides with the line version. Spec: encode as `"_v"`/reserved key, decoder strips only on first-key match; `v` non-integer/0/string → `bad`. Rollback claim "old code reads v:1" leaks `v` into Act objects — say so.
- **M5. Replay drops bad lines from target.** Migration permanently loses raw bytes of bad lines; require source journal retention in report/doc (V3).

## MINOR
- AC-D02 "1 friction" vs rejected recomputed each boot: specify deterministic id.
- R-1.7 prefix test on ref positions: confirm no legit ids start `u:`/`core:`.
- AC-D13 `skippedStamps===2` ambiguous (which two?); list fixture.
- R-2.3 `pack` delegation: clarify `actor` stays binding principal (AC-D10 ok).
- Typo §8 "--".

## Verdict: NO-GO until B1-B3 patched (GO-AFTER-PATCH once applied; B1 needs lead decision shared with R1).
