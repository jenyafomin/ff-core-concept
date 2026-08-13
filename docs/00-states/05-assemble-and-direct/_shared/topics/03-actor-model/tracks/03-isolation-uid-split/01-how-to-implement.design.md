---
type: design
node_type: design-note
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: "isolation uid/process-split — the long pole: how to give the trust boundary OS-level teeth so an agent's principal is forgeable ONLY by the engine/host, never by the agent itself. DESIGN NOT STARTED — this is a KICKOFF SCAFFOLD, not a solution."
related:
  - ../../../../../../../_log/2026-08-12-m5-census-and-operating-model/HANDOFF-FINAL.md   # shift 3: this is the real long pole (not P-2, not topology)
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md                  # ISO-2→ISO-3, ISO-1.5 alt, G4, OQ-3, P-1..P-5
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md     # invariant ① authority≠attribution
  - ../../m5-surface-identity/census/01-boundary-map.design.md                            # grains #1 #2 #4 #8 #10 #13 (topology + propagation empty)
  - ../../m5-surface-identity/census/02-caller-reality.analysis.md                        # same-uid ground truth; all in-process
  - ../../m5-surface-identity/census/03-threat-and-values.critic.md                       # T5 agent-writable config = self-elevation loop
  - ../../m5-surface-identity/design/06-enforcement-precondition-map.design.md            # P-5(populate) UNTESTABLE until uid-split; §3 step 4
  - ../01-root-of-trust/01-how-to-implement.design.md                                     # what this gives teeth to
  - ../02-topology/01-how-to-implement.design.md                                          # what this constrains
phase: DESIGN — KICKOFF SCAFFOLD. Design NOT begun (wave-10 broke on limit). NO code, NO commits, NO fork resolved here.
---

# KICKOFF — isolation uid/process-split (the long pole)

> **Honest status: design NOT started.** This is the scaffold the next wave fills — the invariant, the real
> fork inside, the ordered design steps, the sub-folders to spawn. It resolves nothing. It names WHAT must be
> decided and in WHICH ORDER, grounded in the census + ADR-0011.

## 1. What this is and why it is the long pole

**Invariant this split must guarantee (the whole point):**
> An agent-unit's write-principal — its surface identity and the `seamAuthority` that certifies it — is
> forgeable **only by the engine/host at the seam, never by the unit itself.** Equivalently: the code being
> identified cannot write (a) the append-only journal, (b) the root-of-trust / `seamAuthority` node, or
> (c) the inputs to its own principal resolution.

Today this invariant is **false by construction.** Ground truth (census-02; verified in gateway repo): the
gateway spawns each turn via `spawn('claude', args, { env: {...process.env} })` — **no `uid`/`gid` option**, so
the agent `claude -p` child runs under the **same OS uid** as the engine, in-process. Every "boundary" (ocap
handle, `protected_namespaces`, `can_write:[]`, filesystem home `$FF_ENGINE_HOME/trust/`) is **convention, not
enforcement**: a same-uid child can `fs.writeFile` the registry, the journal, or its own gateway config
(`.gateway/conversations/.../config.json`, `PROMPT.md` — critic T5 self-elevation loop) and no kernel stops it.

**Why it is the long pole (not a fork — engineering):** track-01 root-of-trust names the anchor on paper;
track-02 topology names the wiring. Both are **self-signed theatre until an agent physically cannot rewrite the
engine's record.** The precondition map is explicit: P-5(populate) "write-channel disjoint" is *UNTESTABLE
today by construction… until the isolation uid-split lands" (06-map §4); it gates P-1(build) and P-5(populate)
(map §2 graph, §3 step 4). This split is what turns "agent can't write the root" from a sentence into a
kernel-checkable fact. It is large (process model + IPC + OS primitives), and unlike P-2 its scope did not shrink.

## 2. The real fork inside (separate the invariant from the axis)

Meta-principle: find the non-negotiable, then the tunable.

- **The INVARIANT (non-negotiable):** write-disjointness of the three protected surfaces must be enforced by the
  **kernel/OS**, not by language convention. "Convention-only" is never on the menu.
- **The AXIS (tunable):** the *mechanism* realizing that separation — **separate uid per agent · separate
  process/container · namespace/sandbox** (macOS `sandbox-exec`/App Sandbox; Linux user-namespaces + cgroups).
  ADR-0011 already reserved this as an axis: ISO-1.5 (worker/SES) is an allowed *optimization for trusted
  first-party units*, hard OS process for untrusted plugins; "concrete transport may vary by plugin class"
  (ADR-0011 §Alternatives).

**Honest read of the fork:** it is **neither** "pick one anchor mechanism forever" **nor** "both as a free
setting." It is: **ONE invariant, realized by a MENU of mechanisms selected by agent trust-class, with a hard
FLOOR** — untrusted/third-party unit ⇒ hard OS boundary (separate uid or container); trusted first-party unit
(e.g. `balance-observer`) ⇒ a lighter mechanism *may* be chosen. The thing that varies by type is *which
mechanism*, never *whether separation exists*. So "both as setting by agent type" is legitimate only **above the
floor**; below it there is no choice. Name the floor and the trust-class taxonomy first — that is the real
decision, "uid vs process vs namespace" is downstream of it.

## 3. Design approach (steps, NOT implementation)

1. **Fix the threat/asset model concretely.** Enumerate the three protected surfaces the unit must not write —
   journal (`$FF_ENGINE_HOME`), `policy:seam-authority` / `trust/` node, and resolver inputs (incl. the
   gateway config dir, critic T5). Confirm current writability under same-uid. Output: the disjointness contract.
2. **Name the trust-class taxonomy + the floor.** What unit classes exist (in-process batch ingest · gateway
   `claude -p` turn · future third-party plugin) and which sit below/above the hard-OS floor.
3. **Choose the mechanism menu per class** — uid / process-container / namespace-sandbox — with macOS-vs-server
   feasibility (see OQ). Not one winner: a class→mechanism map, floor enforced.
4. **Map onto the actual runtime.** What must change so the spawned unit runs under a *different* OS principal
   (setuid/drop-priv, `sandbox-exec`, container). Who allocates/owns the identity. Lifecycle: per-turn process
   today → per-agent? (census grain #3 / ADR-0011 OQ-3). Does the engine become a daemon/service the unit
   connects TO (grain #2) — precondition for any IPC boundary at all?
5. **Bind OS identity → `boundaryIdentity`.** How the separated unit's kernel-level identity (socket peer
   credential / spawn-time capability token) becomes the input the frozen `resolveWritePrincipal(boundaryIdentity)`
   reads — closing census grains #5 (what IS surface identity) and #8 (propagation, the spine hole).
6. **Define the teeth (the enforcement test).** An adversarial test where the unit ATTEMPTS to write each
   protected surface and is **DENIED by the kernel**, not by convention — this is P-5's untestable-today criterion
   made testable, and the `forge-boundary-identity` gate the critic asked for (census-03 §4).

**Sub-folders to spawn (each a growing node, not a loose file):**
- `02-uid-allocation/` — who mints/owns per-agent uids; lifecycle & cleanup; **macOS reality check** (uids are
  admin/heavyweight locally — may be infeasible → namespace/sandbox instead).
- `03-process-boundary/` — process/container model; IPC transport + act serialization (grain #4); engine-as-host
  (grain #2); per-turn vs per-agent lifecycle (grain #3).
- `04-fs-permissions/` — the three protected surfaces, ownership, the disjointness contract; `sandbox-exec` /
  user-namespaces + cgroups as the concrete deny.

## 4. Dependencies (what this unblocks)

- **Root-of-trust (track 01 / P-5):** gives `seamAuthority` its teeth — P-5(populate) can go green **only after**
  uid-split (map §1 P-5(e), §3 step 5). Seeding earlier certifies a host that double-stamps behind an absent boundary.
- **P-1 (build M5 resolver):** build-half depends on isolation (map §1 P-1(e)) — any resolver wired before it = theatre.
- **Topology (track 02):** the real process/boundary choice (broker-seed module-vs-standalone) can't be finalized
  without knowing where the isolation boundary sits (grains #1/#2); coupled to gateway extraction.
- **Enforcement flip ③:** transitively — ③ needs P-1 ∧ P-5, both gated here.

## 5. Open questions (owner / next wave)

1. **macOS feasibility (the crux).** Are per-agent OS uids practical on a personal Mac (admin, heavyweight), or
   is the *local* realization sandbox/namespace-based while true uid-split waits for a server/container deploy?
   The name "uid-split" may be aspirational — the local mechanism could differ.
2. **Floor + taxonomy.** What is the hard floor, and does in-process batch ingest (`ingest-rentacar`) even need
   splitting, or only the gateway-spawned / future-plugin path?
3. **Engine as daemon?** Does the engine become a service the unit connects to (grain #2) — precondition for any
   real IPC boundary — or stay a library with the *unit* sandboxed around it?
4. **Coupling to gateway extraction** (memory `dwizh-gateway-extraction`, coupling=0) — does this ride on that work?
5. **Sequencing vs P-2** — both gate P-5(populate); run in parallel?

**Pointers:** census (`m5-surface-identity/census/01|02|03`) · precondition map (`.../design/06`) · ADR-0011
(ISO-1.5 alt, OQ-3, G4) · tracks `01-root-of-trust`, `02-topology`.
