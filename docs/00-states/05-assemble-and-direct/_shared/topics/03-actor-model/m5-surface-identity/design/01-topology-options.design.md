---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (BOUNDARY TOPOLOGY — where the seam owner sits, and how authenticated identity travels from gateway ingress to engine-write stamp)
title: "M5 topology options — where the seam owner lives and how boundary-identity reaches the engine-write stamp under ISO-2"
phase: DESIGN — enumerate candidate topologies + trade-offs; NO code, NO decision (owner fork stays OPEN)
builds-on:
  - ../census/01-boundary-map.design.md          # 21-grain width census; spine = grain #8 (ingress-proof ≠ write-stamp, nothing binds them)
  - ../census/02-caller-reality.analysis.md       # ground truth: 100% in-process; no authenticated identity source anywhere
  - ../census/03-threat-and-values.critic.md      # T1 seamAuthority absent, T2 flaky-gateway theatre, T3 forge-boundary-identity relocates
inputs:
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md   # ISO-2→ISO-3; host=seam owner (:86-89); G4/seamAuthority (:123-145); P-1..P-4 (:244-252); ISO-3-first rejected as premature (:170-174)
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ① (authority never from body); form ② reserved; Decision ③ deferred
  - ../../../../../../../packages/engine/src/ports/principal-resolver.ts   # FROZEN resolveWritePrincipal(boundaryIdentity: string) — string OPAQUE on purpose (:15-18)
  - ../../../../../../../packages/engine/src/ports/principal-stamper.ts    # FROZEN stamp(incoming, principal) → refuse|stamp (G1)
  - ../../../../../../../packages/engine/src/ports/engine-client.ts        # FROZEN write(act): Ack; "agents-manager at M3" = first cross-boundary caller (:1-5)
  - ../../../../../../../packages/engine/src/runner/durable-runner.ts      # single-writer durable store; restart model (:78-91); R5-hash idempotency
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src/channel-telegram/auth/owner-allowlist.ts  # isOwner(from.id); deny-all default; env GATEWAY_TG_OWNER_IDS
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src/claude-runner/cli/claude-cli.ts            # spawn('claude -p') child_process; prompt on stdin (:45-49); env-marker DWIZH_GATEWAY_RUNNER
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src/channel-telegram/conversation-id.util.ts   # conversationId = chat:thread
related:
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md#Открытые-вопросы  # OQ-1 (seam-owner governance), OQ-3 (granularity), OQ-4 (reliability contract)
---

# M5 topology options — where the seam owner sits, and how identity crosses the gap

> BOUNDARY-TOPOLOGY lens. Not a build, not a decision. Stage-1 (census) proved M5's first move is not
> "write a resolver" — it is a **topology choice**: authentication is real at the *gateway ingress*
> (`OwnerAllowlist.isOwner(from.id)`), the stamp must land at the *engine-write* boundary, and **nothing
> connects the two** (census grain #8, the spine). This file enumerates the concrete topologies that could
> connect them, and what each costs. The choice stays an OWNER FORK — it is coupled to a second owner
> decision (gateway extraction/`coupling=0` vs. gateway↔engine coupling) that this file surfaces but does
> not settle.

---

## 0. One ground-truth fact Stage-1 under-weighted: the process boundary ALREADY exists

The census framed the gap as "engine is in-process, no boundary exists yet." A read of the gateway's runner
sharpens this: **the gateway does not run the agent turn in its own heap — it `spawn`s `claude -p` as a
child process** (`claude-cli.ts:45-49`: `spawn(bin, args, {cwd, env, stdio:['pipe','pipe','pipe']})`,
prompt delivered on **stdin** not argv, env stamped `DWIZH_GATEWAY_RUNNER=1`). So there are already **three**
distinct trust tiers, not two:

```
[T-ingress]  Telegram Bot API  →  gateway process (agents-manager, pm2 `agent`)
             authenticates from.id via OwnerAllowlist (owner-allowlist.ts:31)   ← identity is PROVEN here
                    │  spawn(child_process): argv + STDIN(prompt) + env + cwd    ← a REAL OS process boundary, today
                    ▼
[T-agent]    claude -p turn (child OS process, isolated address space)
             emits tool-calls / stdout back to the parent gateway               ← untrusted-ish compute unit (ISO-2 "unit")
                    │  (today: NOTHING; the agent turn never calls engine.write) ← grain #8 gap lives HERE
                    ▼
[T-engine]   Engine.write(act) → DurableRunner single-writer journal            ← stamp must land here
             (durable-runner.ts:59; append-only, R5-hash idempotent)
```

The load-bearing consequence: **the "where does the boundary sit" question is really "which of these three
tiers owns the stamp, and what carries the proven identity down the tiers to it."** The spawn boundary
gateway→agent is a genuine ISO-2 boundary that exists *today* — the topologies below differ mainly in where
the engine sits relative to it and what rides the carrier across the T-agent gap.

Two facts constrain every option:
- **The carrier gateway→agent is `argv/stdin/env/cwd`** — and the agent (T-agent) can read and *re-emit*
  all of it to ITS OWN children. Anything the agent can fabricate downstream is attribution-data, never
  authority (invariant ①, `ADR-0010`). Critic T5 landmine: the agent can even self-edit its binding files
  (`CLAUDE.md` gateway cascade) — so the carrier the *engine* trusts must never be a channel the T-agent
  unit can write.
- **P-2 (gateway dup/restart) and P-3 (`seamAuthority` reserved) are topology-INDEPENDENT gates.** No
  topology below removes them; P-3 (add the field to the reserved form) is owed *now* regardless of choice,
  and P-2 (verified gateway-dup fix) blocks the *enforcement flip* under every topology. They are called
  out per-row only where the topology changes the *exposure*, not the obligation.

---

## 1. Candidate topologies

### Topology A — Engine in-process inside the host; host stamps at the ingress→write call (co-located seam)

**Shape.** `packages/engine` is linked as a library INTO the seam-owning host (the gateway, or a thin
host wrapper around it). The agent turn (T-agent child) never calls `engine.write` directly; it emits
*intents* (structured act-requests) back up the spawn channel (stdout / a gateway-mediated `write` tool).
The **host** — same process that ran `OwnerAllowlist.isOwner(from.id)` — resolves the principal and calls
`stamp()` + `engine.write()`. Auth-point and stamp-point **collapse into one process boundary**; grain #8
is closed by *co-location* (no carrier needed across the trusted hop).

- **How `AuthenticatedPrincipal` is legitimately born.** In the host, in the same call stack that proved
  `from.id`: map uid→subject, construct `{subject, trust:'channel', issuer:'gateway:agents-manager'}`
  (`principal-resolver.ts:30-37`), hand to `stamp()`. Legitimate because there is *no untrusted hop*
  between proof and stamp — this is literally ADR-0011's "host-process = seam owner, stamps like the
  gateway sets `thread_id`" (`ADR-0011:86-89`).
- **Trust assumptions.** Host process integrity; `GATEWAY_TG_OWNER_IDS` env correctness; and — critically —
  that agent-emitted intents are treated as attribution only (host stamps the REAL principal; a forged
  `actor` in the intent triggers G1 REFUSE, `principal-stamper.ts:41-48`).
- **Retrofit-asymmetry (append-only).** **Worst exposure of the three.** The stamper IS the flaky process
  (P-2): a duplicated turn re-runs the intent and the *same* process stamps twice; the R5 kernel hash
  (`durable-runner.ts:58`) catches byte-identical replays but a dup with a fresh `ts` slips through as two
  journal entries → permanent poisoning (`ADR-0011:190-194`). Idempotency must be added AT the host stamp
  keyed on a turn-nonce, not just body-hash.
- **ISO-2 → ISO-3 fit.** Strong ISO-2 fit *for the agent↔engine boundary* (the spawn boundary is the
  isolation). ISO-3 later: a remote agent can't be stamped by a local co-located host → this topology does
  NOT extend to untrusted transport without becoming Topology B anyway. It is an ISO-2 terminal shape.
- **Frozen-port demands.** Fits directly: `boundaryIdentity` = the host's authenticated `from.id`/
  conversationId; `resolveWritePrincipal`/`stamp` run in-host. Needs `seamAuthority` (P-3) added to the
  reserved form = "who authorized the gateway to stamp `user:jenya`."
- **Cost / reversibility.** Cheapest infra (reuses the existing spawn boundary; no new process). BUT it
  **creates gateway→engine coupling** — directly against the `coupling=0` / gateway-extraction direction
  (memory `dwizh-gateway-extraction`; ADR-0006 strangler). Marries engine lifecycle to the gateway.
  Reversible as a *seam binding* (engine contract frozen), but the coupling decision is sticky.

### Topology B — Engine as a separate service; gateway mints a SIGNED boundary-identity token carried over IPC

**Shape.** The engine runs as its own daemon (`DurableRunner`-hosted, single-writer over the durable
store). The gateway authenticates at ingress, then **mints a short-lived signed token** binding
`{subject, trust, issuer, seamAuthority, nonce, exp}`. The token rides the carrier: gateway → spawn env /
IPC → agent → engine-IPC. The **engine daemon is the seam owner**: at its write boundary it VERIFIES the
signature and stamps from the *verified* token — never from a self-claimed field.

- **How `AuthenticatedPrincipal` is legitimately born.** At the engine's write boundary, from a
  cryptographically *verified* token. Gateway = issuer (holds signing key); engine = verifier + stamper.
  Grain #8 is closed by a **signed carrier** that survives untrusted hops (incl. the T-agent unit, which
  can forward but not forge the token).
- **Trust assumptions.** Gateway signing key confidentiality; key distribution gateway↔engine; nonce/exp
  replay protection. This is **B / крипто-аттестация** — the ISO-3 machinery (`ADR-0011:79,96-99`).
- **Retrofit-asymmetry.** **Best structural answer to P-2.** The token `nonce` becomes the idempotency key
  at the trusted verifier; a duplicated gateway turn emits a duplicate token → engine rejects the replay
  *before* journaling. Dedup moves to the trusted stamp point, decoupled from the flaky gateway.
- **ISO-2 → ISO-3 fit.** This IS the ISO-3 end-state form. ADR-0011 explicitly **rejects ISO-3-first as
  premature** — "building the turnstile before the wall" (`ADR-0011:170-174`): B is the threshold for
  *untrusted transport*, not needed for a same-machine boundary. Form is reserved (② `issuer` + delegation
  slot) so 0-migration, but building the crypto infra now overshoots the ratified ISO-2 decision.
- **Frozen-port demands.** Best fit for the port's *opaque* `boundaryIdentity: string` — designed for
  exactly an issuer token (`principal-resolver.ts:15-18`). Resolver = verify-signature → `AuthenticatedPrincipal`.
  Needs `seamAuthority` in BOTH the token and the reserved form (P-3).
- **Cost / reversibility.** HIGH: key mgmt, rotation, issuer infra, daemon lifecycle, the IPC transport
  (census grain #4). Heavy to unwind. Overshoots present need.

### Topology C — Sidecar principal-broker / issuer-of-the-issuer (dedicated seam owner, OS-cred carrier)

**Shape.** A small trusted **principal-broker** process is the *sole* seam owner. The gateway
authenticates the channel and reports the raw boundary event (`from.id`, conversationId) to the broker
over a **peer-credential-authenticated local channel** (unix domain socket, `SO_PEERCRED`). The broker
holds the uid→subject registry AND the `seamAuthority` policy (who may stamp what). It issues the
`AuthenticatedPrincipal` that the engine's stamper consumes; the engine trusts ONLY the broker's socket
identity (kernel-enforced peer-cred), not the gateway or agent directly. This is ADR-0011's
"issuer-of-the-issuer" (`ADR-0011:131-135`) made a concrete component: the broker IS the `seamAuthority`;
the gateway is a mere authenticated *reporter* of channel events.

- **How `AuthenticatedPrincipal` is legitimately born.** In the broker — the single governance point that
  answers G4 by construction. The engine verifies the broker via OS peer-cred (non-forgeable on the local
  machine, no crypto keys). Grain #8 closed by a **broker-issued principal over a peer-cred-authenticated
  local socket** — an ISO-2-native carrier (same machine, real OS boundary) with none of B's key infra.
- **Trust assumptions.** Broker process integrity + socket filesystem ACL; OS peer-cred (kernel-enforced,
  strong same-machine). No key management. Remote later → the broker adds token issuance (becomes B
  internally) without changing the engine's "I trust the broker's principal" contract.
- **Retrofit-asymmetry.** Good: broker + engine own dedup (idempotent by `(conversationId, turn-nonce)`),
  isolated from gateway dup (P-2 mitigated structurally). **Cost:** centralizes the poisoning-critical
  authority in one process → V5 Суверенность / cross-project blast radius (critic T7) — but that IS OQ-1
  governance, already parked as an M5-agenda item (`ADR-0011:207-211`).
- **ISO-2 → ISO-3 fit.** **Best staged fit.** Local now = peer-cred socket (ISO-2, channel-trust A, zero
  crypto — honors "don't build B yet"). Remote later = broker issues tokens (B) → ISO-3 **without touching
  the frozen engine contract** (engine always trusts "the broker's principal"). The `seamAuthority` field
  is literally the broker's identity. Matches ADR-0011's issuer-of-issuer language most directly, and
  **preserves gateway `coupling=0`** (gateway talks to the broker, never imports the engine).
- **Frozen-port demands.** `resolveWritePrincipal(boundaryIdentity)` = adapter that calls the broker;
  `boundaryIdentity` = the peer-cred socket handle / broker request. `seamAuthority` = broker id. Needs the
  field reserved (P-3).
- **Cost / reversibility.** Medium-high: a new process + registry + socket protocol (but no crypto). More
  moving parts than A; far less than B's key infra. The broker is an extractable unit — reversible by
  collapsing it back into the host (→ A) or promoting it to tokens (→ B).

### Topology D — Baseline / null: no cross-process seam yet (defer; keep honest `unverified`)

**Shape.** Engine stays in-process with its batch callers; no gateway linkage; `boundaryIdentity` = local
OS user/process cred; every act stays `trust:'unverified'` unless run under an explicitly trusted local
operator context. This is the DEFER-build verdict made a topology: it closes grain #8 by *not asserting*
anything the system can't legitimately prove. Included as the comparison baseline because both the census
(§3) and critic (T2) hold that implementing a resolver against the current flaky gateway is theatre.

- **Legitimacy / trust / retrofit / ISO / cost.** Nothing new stamped → nothing to poison; zero cost; fully
  reversible; honest per ADR-0010's retrofit-honesty (`ADR-0010` Decision ②). Buys time to land P-2/P-3.
  Does NOT advance the north-star boundary — it is the "wait" option, not a "wrong" one.

---

## 2. Comparison

| Axis | **A · co-located host** | **B · signed-token service** | **C · sidecar broker** | **D · defer/null** |
|---|---|---|---|---|
| Seam owner (stamper) | host = gateway process | engine daemon (verifier) | dedicated broker process | none (stays `unverified`) |
| Engine location | in-process w/ host | separate daemon | separate daemon (or in-proc) | in-process w/ batch callers |
| Carrier across grain-#8 gap | co-location (no carrier) | **signed token** | **peer-cred socket + broker registry** | none |
| `AuthenticatedPrincipal` born at | host, pre-stamp | engine, post-verify | broker | n/a |
| Trust root | host integrity + env | signing key | broker integrity + OS peer-cred | local OS user |
| Crypto needed | none | **yes (keys/rotation)** | none (local) → yes only at ISO-3 | none |
| P-2 (dup) exposure | **worst** (stamper=flaky proc) | best (nonce at verifier) | good (broker dedup) | n/a |
| G4 / `seamAuthority` answered | field only (who authz host? open) | in token (needs governance) | **by construction (broker=issuer-of-issuer)** | deferred |
| Gateway `coupling=0` (extraction dir.) | **breaks it** (gw imports engine) | preserved | **preserved** | preserved |
| ISO-2 fit (now) | strong (terminal) | overshoot (ISO-3 form) | **strong + native** | trivially fits |
| ISO-3 growth path | must become B | already B | **broker adds tokens, engine contract unchanged** | none |
| Frozen-port fit | direct | best (opaque string = token) | good (opaque = socket/req) | n/a |
| Cost | **lowest** | **highest** | medium-high (no crypto) | zero |
| Reversibility | sticky (coupling) | heavy | good (collapse→A / promote→B) | full |

---

## 3. Recommendation (confident on SHAPE; the process-fork stays OWNER-OWNED)

**Recommended shape: seam placement of A, factored as the broker of C, with B's token form reserved for
ISO-3.** Concretely: the seam owner is a **distinct principal-stamp unit at the host tier** (honoring
ADR-0011:86-89 "host = seam owner" and reusing the spawn boundary that already exists), but the stamp /
uid→subject registry / `seamAuthority` logic lives in a **separate module — a broker seed** — not fused
into the flaky gateway transport and not reachable by the T-agent unit. Then:

- **ISO-2 now** = the broker issues the principal over an **ISO-2-native carrier** (co-location *or*
  peer-cred socket — same-machine, no crypto), which is exactly the boundary ADR-0011 ratified and NOT the
  crypto turnstile it defers (`ADR-0011:170-174`).
- **ISO-3 later** = the broker gains token issuance (B) **without changing the frozen `write(act): Ack`
  contract** or the engine's "trust only the broker's principal" rule → 0-migration, form ② already
  reserved.

**Why C-shaped over pure A:** A puts the stamp in the documented-flaky process (worst P-2 exposure) and
**breaks gateway `coupling=0`**, fighting the ratified strangler/extraction direction (ADR-0006, memory
`dwizh-gateway-extraction`). The broker isolates the poisoning-critical stamp from the flaky transport and
answers G4/`seamAuthority` *by construction* (broker = issuer-of-the-issuer), which is the one guardrail
the critic flags as CRITICAL and still-absent (T1).

**Why not B now:** B is the correct end-state form but is precisely the ISO-3-first prematurity ADR-0011
rejects — crypto infra over a same-machine boundary. C reaches B by growth, not by building it early.

**Confidence: medium-high on the shape** (seam owner is a *separate governed unit*, engine trusts *only*
the stamp, carrier is an ISO-2-native local channel the agent can't write, form reserves the ISO-3 upgrade).
**Lower confidence on the host process** — in-gateway broker module vs. standalone sidecar is the genuine
fork, and it is **coupled to a decision outside M5's scope: the gateway extraction / `coupling=0` direction**
(owner-owned per ADR-0006). This file does NOT close that fork.

**Topology-independent obligations (owed regardless of the fork):**
- **P-3 now:** add `seamAuthority` / `policy_source` to the reserved form (`PrincipalAssurance` in
  `types.ts`, and the two frozen ports) — retrofit-impossible after the first stamped act
  (`ADR-0011:132-135`; critic T1). This is a form-only patch that should land before M5 proper.
- **P-2 gates enforcement under EVERY topology:** the enforcement flip stays blocked until a *verified*
  gateway-dup fix is linked (`ADR-0011:246-250`). B/C reduce the *exposure*; they don't retire the gate.
- **New adversarial target (critic T3):** add a `forge-boundary-identity` gate — assert that when the
  resolver's *input* is attacker-influenced, it refuses or trust stays `unverified`. The chosen carrier
  (A co-location / C peer-cred / B token) is exactly what this test must pin down as non-forgeable.
