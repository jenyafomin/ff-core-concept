---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
related:
  - ../design/04-SYNTHESIS-m5-decision-ready.md   # §3 P-3-резерв seamAuthority — the decision this backs
  - ../design/02-propagation-and-g4-patch.analysis.md   # Q2 — seamAuthority patch spec (field target)
  - ../../decisions/RATIFY-2026-08-12-adr-0010-0011.decision.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/core/types.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/engine.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/ports/principal-resolver.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/ports/principal-stamper.ts
scope: REALITY-ANCHOR only — no design decisions made here, read-only ground truth for decision-3 (additive `seamAuthority` reservation)
---

# REALITY-ANCHOR — ground truth for the `seamAuthority` additive reservation (decision-3)

> Read-only investigation. No code touched. Purpose: let a builder implement decision-3 (add `seamAuthority`
> to `AuthenticatedPrincipal` as REQUIRED and to `PrincipalAssurance` as OPTIONAL) with zero guesswork about
> current shapes, call-sites, and serialization strictness.

## 1. `Act` — definition and every current field

**File:** `packages/engine/src/core/types.ts:257-282`

```
257  export interface Act {
258    id: string;
259    actor: SubjectRef;
260    provenance: string | Provenance;
261    /** Engine-assigned, immutable. Callers do not supply this on write(). */
262    recordedAt: string;
263    actKind: ActKind;
264    edges: Edge[];
265    payloadRef?: string;
266    payloadHash?: string;
267    hashScheme?: HashScheme;
274    principal?: PrincipalAssurance;
281    payload?: unknown;
282  }
```

Field list, verbatim, in declaration order: `id`, `actor` (`SubjectRef`, `types.ts:14` — `type SubjectRef = string`), `provenance` (`string | Provenance`), `recordedAt` (engine-assigned, see engine.ts:75), `actKind` (`ActKind`), `edges` (`Edge[]`), `payloadRef?`, `payloadHash?`, `hashScheme?` (`HashScheme`), `principal?` (`PrincipalAssurance` — **this is the Стадия-1 field**, added under ADR-0010 §Decision ②, doc-comment `types.ts:273-278` says explicitly "The `write(act): Ack` signature stays FROZEN — this is reserved via the envelope, not a new port parameter"), `payload?` (`unknown`).

**`PrincipalAssurance`** (the type of `Act.principal`), `types.ts:231-247`:
```
231  export interface PrincipalAssurance {
233    whoActed?: PrincipalTrust;
235    underWhoseAuthority?: PrincipalTrust;
240    issuer?: string;
246    delegation?: unknown[];
247  }
```
`PrincipalTrust` = `types.ts:215` → `'unverified' | 'channel' | 'attested'`.

**No `minted_by` field on `Act` itself.** `minted_by` is NOT an act field — it is a key the engine force-bind writes into `Act.payload` (see §2, `engine.ts:107`: `payload: { ...payload, minted_by: finalized.actor }`), i.e. it lives inside the opaque `payload: unknown` for grant-kind writes only, not in the typed envelope.

## 2. `write()` PEP — exact force-bind guard lines

**File:** `packages/engine/src/engine.ts:73-155` (method), force-bind block `84-126`.

- `engine.ts:75` — `recordedAt` force-set, ignoring any caller value: `let finalized: Act = { ...act, recordedAt: new Date().toISOString() };`
- `engine.ts:76-77` — `admit()` gate (PII/schema), refuses BEFORE journal write.
- `engine.ts:81-82` — `admitHome()` gate (one-home barrier).
- `engine.ts:99-126` — the write-side PEP block itself, gated by `isProjectable(finalized)` (only `domain_event` acts with a `source_ref` reach it):
  - `engine.ts:104-108` — **F1 force-bind**: `if (isGrantWrite) { finalized = { ...finalized, payload: { ...payload, minted_by: finalized.actor } }; }` — stamps `minted_by` from the engine-seen writer (`finalized.actor`), overwriting any self-declared value in the body.
  - `engine.ts:110-115` — **F2/F3 namespace ceiling**: `if (this.policy.canWriteNamespace(finalized.actor, targetId, this.graph) === 'deny') return { ok:false, reason: ... }` — refuses writes into protected namespaces (`policy:*`, `meta:cap/core:*`, …) without `core:manage-core`.
  - `engine.ts:120-125` — **mint-authority gate**: `if (this.policy.canMintGrant(finalized.actor, grantView, this.graph) === 'deny') return { ok:false, reason: ... }` — refuses minting/altering a grant without `core:manage-grants`.
- Comment block `engine.ts:92-98` is load-bearing: it names the OPEN fork explicitly — `actor` is still self-declared under the frozen `write(act)` port; impersonating a privileged principal is "the T-actor-delegation fork, which needs an authenticated principal source (ViewerResolver seam / port change). Out of Stage-1 scope; flagged." **This is exactly the gap decision-3's seam (principal-resolver/stamper) targets — nothing in `engine.ts` calls either port today** (confirmed by grep, §3 below).

## 3. The two seam ports — signatures + 0 call-sites confirmed

**`packages/engine/src/ports/principal-resolver.ts`** (whole file is a doc-comment-heavy paper-freeze, `Aug 12 04:02`):
```
30  export interface AuthenticatedPrincipal {
32    subject: SubjectRef;
34    trust: PrincipalTrust;
37    issuer: string;
39  }
...
43  export interface PrincipalResolver extends ViewerResolver {
48    resolveWritePrincipal(boundaryIdentity: string): AuthenticatedPrincipal;
50  }
```
Doc-comment top (`:2-19`) states plainly: "PAPER-FREEZE ONLY (design-phase, no behavior) ... there is NO implementation, and nothing is wired into `engine.ts` or the write path."

**`packages/engine/src/ports/principal-stamper.ts`**:
```
type PrincipalStampResult =
  | { ok: true; act: Act }
  | { ok: false; reason: string };

interface PrincipalStamper {
  stamp(incoming: Act, principal: AuthenticatedPrincipal): PrincipalStampResult;
}
```
(interface at the file's bottom, `export interface PrincipalStamper { stamp(incoming: Act, principal: AuthenticatedPrincipal): PrincipalStampResult; }`). Doc-comment (`:2-8`) restates: "NO implementation, and nothing is wired into `engine.ts` or the frozen `write(act): Ack` path."

**0 call-sites confirmed.** `grep -rn "principal-resolver\|principal-stamper\|PrincipalResolver\|PrincipalStamper" packages/*/src packages/*/test` returns exactly 5 hits, all definitional or re-export, none a call/instantiation:
- `packages/engine/src/index.ts:20-21` — barrel re-export only (`export * from './ports/principal-resolver.js'` / `-stamper.js`).
- `packages/engine/src/ports/principal-stamper.ts:2,30` — its own file (doc-comment + import of `AuthenticatedPrincipal` type).
- `packages/engine/src/ports/principal-resolver.ts:2,43` — its own file (doc-comment + interface decl).
- `packages/engine/test/principal-seam.test.ts` — compile-only type assertions, see §5. No other package (`ingest-rentacar`, `rental-balance`, `core`) references either symbol at all.

## 4. Persistence/serialization — is it strict-schema or lenient?

**Two write paths exist; neither validates `Act`'s own field set.**

1. **Primary/"real" path — `MemoryStore.writeAct`**, `packages/engine/src/adapters/store-memory.ts:48-52`:
   ```
   48  writeAct(act: Act): Act {
   49    this.journal.push(act);
   50    foldInto(this.projection, act, this.registry);
   51    return act;
   52  }
   ```
   Pure in-memory array push of the TS object. **No serialization, no schema check, no strictness at all** — an extra optional field on `Act` is simply an extra property on a plain JS object sitting in an array.

2. **Disk/md adapter path — `store-md.ts` (`@ff/core` bridge)**, `packages/engine/src/adapters/store-md.ts:218-227`:
   ```
   217  /** Persist an Act as an @ff/core 'trace' carrier (append-only write-model on disk). */
   218  async writeAct(act: Act): Promise<void> {
   219    await this.inner.create({
   220      id: act.id,
   221      kind: 'trace',
   222      title: `${act.actKind}:${act.id}`,
   223      body: JSON.stringify(act),
   224      actor: act.actor,
   225      meta: { carrier: ACT_CARRIER_MARK },
   226    });
   227  }
   ```
   The **whole `Act` is `JSON.stringify`'d into the `body` field** of an `@ff/core` `FFNode` carrier (`kind: 'trace'`). The only schema that runs is `@ff/core`'s `frontmatterSchema` (`packages/core/src/schema.ts:14-29`, plain `z.object({...})`, no `.strict()`), which validates the **carrier's own frontmatter fields** (`id, kind, title, tags, parentId, links, status, due, importance, context, actor, created, updated, meta`) — it **never inspects `body`'s JSON content**, so it cannot see, let alone reject, any field inside the serialized `Act`. Validation call-sites: `packages/core/src/store.ts:55` (parse on read), `:83` and `:111` (parse on write, `frontmatterSchema.parse({ ...node, body: undefined })` — `body` explicitly excluded before parsing).

3. **`idempotencyHash`** (`packages/engine/src/core/idempotency.ts:33-40`) only hashes `{ source_ref, actKind, payload, edges }` — it explicitly excludes `id`, `recordedAt`, `actor`, and (by omission) `principal`/any new field. Adding `seamAuthority` inside `PrincipalAssurance` does **not** change idempotency-hash content or invalidate existing hashes.

4. **`admission.ts`'s `ActSchema`** (`packages/engine/src/core/admission.ts:16-20`) is a per-`actKind` allowlist of PII-bearing **payload** dotted-paths only (`piiFields: string[]`) — it does not enumerate or validate `Act`'s top-level field set at all, so it is not a blocker either.

**Conclusion: fully lenient on both paths.** Neither the in-memory journal nor the disk carrier enforces an exhaustive/strict schema over `Act`'s own fields (only the disk path's carrier-frontmatter is schema-checked, and that schema is orthogonal — it never parses the JSON-stringified `body`). An additive optional field inside `PrincipalAssurance` (or anywhere on `Act`) is genuinely a 0-migration change on the current code paths — the "0 миграций" claim in `04-SYNTHESIS-m5-decision-ready.md:86` and `state.md:35` is verified true against the actual write/persist code, not asserted on faith.

## 5. Existing tests touching the stamp/ports ("form-only" tests)

**File:** `packages/engine/test/principal-seam.test.ts` (57 lines) — the only test file referencing either port.
- `:22` — `describe('ADR-0010 §③-bis write-principal seam — shape only, no behavior', ...)`.
- `:23-30` — test (a): constructs an `AuthenticatedPrincipal` literal `{ subject: 'user:jenya', trust: 'channel', issuer: 'gateway:agents-manager' }` and asserts `p.trust === 'channel'`. **Adding a REQUIRED `seamAuthority` field to `AuthenticatedPrincipal` will break this literal at compile time** — it must gain a `seamAuthority` value or the field must default/be optional at this call-site; this is the one concrete compile break decision-3 will cause, and it is a one-line fixture edit, not a design problem.
- `:32-42` — test (b): `const resolver = {} as PrincipalResolver;` — pure type-cast, never calls `resolveWritePrincipal`. Unaffected by an `AuthenticatedPrincipal` field addition (the cast is not structurally checked).
- `:44-55` — test (c): builds a `PrincipalStampResult` with a literal `Act` object (`id, actor, provenance, recordedAt, actKind, edges` only — no `principal` field set) and a `refused` variant. Unaffected by adding `seamAuthority` to `PrincipalAssurance` (it's optional, and this literal never sets `principal` at all).
- No other test file (searched `packages/*/test`) references `Act.principal`, `PrincipalAssurance`, `AuthenticatedPrincipal`, or either port.

## Reality-anchor summary (no design opinions)

- `Act` (`packages/engine/src/core/types.ts:257-282`) already carries a reserved `principal?: PrincipalAssurance` field from Стадия-1 (ADR-0010 §Decision ②) — this is DISTINCT from the `seamAuthority` decision-3 targets, which per `02-propagation-and-g4-patch.analysis.md:82-93` and `04-SYNTHESIS-m5-decision-ready.md:84-87` is a NEW field: REQUIRED on `AuthenticatedPrincipal` (`principal-resolver.ts:30-39`), OPTIONAL on `PrincipalAssurance` (`types.ts:231-247`, alongside `issuer?`).
- `write()`'s force-bind PEP (`engine.ts:99-126`) force-stamps `minted_by` (into `payload`, not `Act`), enforces namespace-ceiling and mint-authority — none of it touches `Act.principal` or either seam port; both ports have confirmed **0 call-sites** anywhere in `packages/*/src` or `packages/*/test` beyond their own declaration files and the barrel re-export (`index.ts:20-21`).
- Persistence is lenient on both paths: `MemoryStore.writeAct` (`store-memory.ts:48-52`) is a raw in-memory push (no schema at all); `store-md.ts`'s disk adapter (`:218-227`) `JSON.stringify`s the whole `Act` into an opaque `body` string, and the only schema that runs (`@ff/core`'s `frontmatterSchema`, `packages/core/src/schema.ts:14-29`) validates carrier frontmatter, never the JSON body content — so an additive optional field is a genuine 0-migration change on real code, not just an assertion in docs.
- The one concrete compile-time effect of adding a REQUIRED `seamAuthority` to `AuthenticatedPrincipal`: the literal at `principal-seam.test.ts:24-28` will need a `seamAuthority` value added (or the field made optional) — the single fixture in the whole repo that constructs this type.
- `idempotencyHash` (`core/idempotency.ts:33-40`) and `admission.ts`'s `ActSchema` (`:16-20`) both operate on `payload`/`edges`/`actKind` only — neither is a hidden blocker to the additive reservation.
- No hidden blocker found: no exhaustive/strict-object validation, no runtime reflection over `Act`'s or `PrincipalAssurance`'s key set, and no second call-site outside the one test file that would need updating.
