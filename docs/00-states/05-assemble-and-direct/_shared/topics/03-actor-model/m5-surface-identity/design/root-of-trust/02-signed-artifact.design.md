---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: analyst (option B of decision-4 fork — owner-signed artifact / cryptographic attestation)
title: "DESIGN — root-of-trust option B: owner-signed artifact for seamAuthority"
scope: Project (FF-Personal-Management) — decision 4 of the M5 owner-decision sequence (out-of-band root that certifies seamAuthority). DESIGN only, no code.
related:
  - ../04-SYNTHESIS-m5-decision-ready.md            # §2 (the fork itself: a/b/c) + §6 decision 4 (owner recommendation = (a))
  - ../05-seamAuthority-reservation.spec.md         # the frozen shape seamAuthority must fill (opaque string, A/B-neutral)
  - ../05b-seamAuthority-reality-anchors.analysis.md # ground truth: 0 call-sites, fully lenient persistence, 187/187
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md  # G4 (:123-145), ISO-3 provisional endstate (:100-103), "turnstile before the wall" (:170-174)
phase: DESIGN — one option among a/b/c for owner-decision 4; NOT a recommendation to build, NO code, NO commits
counterpart: 01-static-registry.design.md  # option (a) — not authored in this pass; referenced by contrast throughout
---

# DESIGN — root-of-trust option B: owner-signed artifact / cryptographic attestation

> This is ONE option for decision 4 (`04-SYNTHESIS §2/§6.4`) — *who certifies `seamAuthority` out-of-band,
> outside the record of any stamping process and outside anything the agent can edit.* It is written to be
> buildable verbatim, but the verdict below is **do not build it now** — see §6. Option (a), the engine-side
> static registry, is the owner's current recommendation; this document exists so that recommendation is
> chosen *because* it wins a real comparison, not by default.

---

## 1. What gets signed

Two candidate signing targets exist; only one is designed here.

- **Rejected: per-act / per-write signature.** Signing every act (or every resolved principal per write)
  would require the signer (owner's private key) to be reachable synchronously on the hot write path —
  either online (defeats "private key never touches a running process," §2) or embedded in the host
  (defeats the whole point of keeping the key outside the certified system). It also does not address the
  actual question G4 asks — *"is this HOST allowed to stamp at all"* — which is answered once per host
  lifetime, not once per act. Synthesis already flags this: signing "does NOT fix dup — two independently,
  validly signed tokens on one logical turn" (`04-SYNTHESIS:41-43`). Rejected as the wrong grain.
- **Chosen: a host certificate — signed once per host provisioning, long-lived.**
  ```
  HostCert = {
    hostId: string,        // e.g. "gateway:agents-manager@m3" — the seam-owner identity this cert vouches for
    kid: string,           // key/cert id, referenced by seamAuthority
    notBefore: string,     // ISO-8601
    notAfter: string,      // ISO-8601 — deliberately long-lived (months), single-owner = low churn
    scope?: string[]       // optional future narrowing (e.g. namespace allowlist); unused at first cut
  }
  signature = Ed25519_sign(ownerPrivateKey, canonicalize(HostCert))
  ```
  `seamAuthority` (the opaque string already frozen on `AuthenticatedPrincipal`/`PrincipalAssurance`,
  `05-spec §3.1/3.2`) is populated as a **reference**, not the raw signature: `seamAuthority = "cert:" + kid`.
  The signed cert itself lives in a small cert store next to the resolver (§2), not inside the `Act`. This
  keeps the additive type contract exactly as specified — `seamAuthority` stays an opaque string, no
  verification mechanism baked into the type (`05-spec` G-3, N-4) — so choosing B later does not reopen the
  already-landed P-3 patch.

## 2. Key management — where the private key root lives, where the public side lives

- **Private key: never touches any process the engine, resolver, or gateway ever runs.** It lives on a
  medium the owner exclusively controls and that is *not* part of this system's runtime at all — e.g. an
  offline keypair generated once on the owner's own machine (or a hardware key), used only at
  host-provisioning time (rare: once per new host, not per session, not per act). It is generated and used
  fully outside `packages/engine`, outside `agents-manager`, outside any git-tracked path. This is the
  security-relevant claim — see §5.
- **Public key: engine-side, in the same category of storage option (a) already proposes for its
  registry** — a file the resolved unit (agent, gateway process) cannot write, e.g.
  `config/trust/owner-public-key.pem` + `config/trust/host-certs/*.json` (the signed certs, one file per
  `kid`), read-only mount / not on any path the write-PEP or the resolved principal can reach. **This is the
  load-bearing fact for the whole comparison in §5**: A and B put their root artifact in the *identical*
  location class (engine-side, owner-writable-only). B does not move the root anywhere A couldn't already
  put it — B adds a signature *on top of* that same storage boundary.

## 3. Verification step — where it runs, and what it does NOT touch

- **Not in the write-PEP.** `engine.ts:84-126` stays untouched, exactly as option (a) and the P-3 spec
  require (`05-spec` N-1: no PEP reads `seamAuthority` yet). Verification is **bootstrap-time**, inside the
  future resolver's construction — not per-act.
- **Concretely (future `PrincipalResolver` implementation, still unbuilt today):** on process start (or
  lazily on first `resolveWritePrincipal` call), the resolver loads its own `hostId`, the matching
  `HostCert` + signature from the cert store, and the owner's public key; verifies the Ed25519 signature and
  checks `notBefore <= now <= notAfter`. If valid → `seamAuthority = "cert:" + kid` is set on the
  `AuthenticatedPrincipal` it returns. If invalid, expired, or missing → **the resolver MUST refuse to
  resolve** (mirrors the G1 refuse-not-rewrite pattern, ADR-0010) rather than silently omit
  `seamAuthority` or fall back to `unverified` — a missing/expired cert is a hard stop, not a degrade.
- Crypto cost is paid **once per process lifetime** (signature verify at startup), not on the write hot
  path — same performance shape as option (a)'s `hostId in registry` check, just with an added asymmetric
  verify at the one-time bootstrap moment.

## 4. Lifetime, rotation, revocation, offline/bootstrap story

- **Lifetime:** long (months), matching single-owner low host-churn — a new host (new machine, new deploy
  target) is a rare, deliberate owner action, not a recurring session event.
- **Rotation:** owner re-signs a new `HostCert` with a fresh `notAfter` before the old one expires, and
  manually places the new cert file at the host — out-of-band, no distribution channel needs building
  (single owner has direct filesystem access to every host they own today).
- **Revocation:** owner deletes (or overwrites) the cert file at the host's cert store. No CRL/OCSP
  infrastructure — at this scale revocation-by-deletion is sufficient, identical operational shape to
  option (a)'s "remove the hostId from the list."
- **Offline/bootstrap:** fully offline, no chicken-and-egg. The owner generates the keypair once, on their
  own machine, with no running engine or gateway process involved. The first `HostCert` (for the gateway
  M3 seam) is signed offline and shipped alongside the engine's static config the same way option (a)'s
  registry file would be hand-authored and shipped. No CA, no live signing service, no network dependency
  at verification time (verification only needs the already-stored public key + cert, both local).

## 5. Stress-test — "certifier outside certified": is the private key a cleaner root than a registry file?

**Yes, in one specific and honest sense — but that sense is not today's threat.**

- Both A (registry) and B (signed cert) place their artifact at the *same* storage boundary: engine-side,
  not writable by the resolved unit (§2). Against the threat model every wave of this M5 census actually
  named — **an in-process or out-of-process AGENT trying to self-declare or forge identity** (T1, T2, T3,
  T5 in `03-topology-redteam.critic.md` / `03-threat-and-values.critic.md`) — A and B are **equally
  sufficient**. The agent can write to neither the flat list nor the cert store; a bare membership check
  and a signature check both refuse it identically.
- Where they diverge: **who or what can forge a NEW valid entry if the *engine-side storage itself* is
  compromised** — not by the agent, but by something else (a bug in an unrelated engine component, an ops
  mistake, a supply-chain compromise of a dependency, physical access to the host running the engine, or —
  the case that actually matters — the artifact being copied to a *second*, less-trusted machine).
  - For A: the registry file **is** the root. Anyone who can write that one path (by whatever means) has
    fully forged legitimacy — there is no secondary check. The root and its storage location are the same
    object.
  - For B: compromising the engine-side cert store lets an attacker delete, replace-with-an-old-cert
    (replay), or deny — but **not mint a new valid cert**, because the private key that could do that was
    never on that machine, was never part of this system's runtime, and stays under the owner's exclusive,
    separate control.
- So the private key genuinely IS the cleaner "certifier outside certified" in the strict sense: it moves
  the root **fully outside the software system** (onto a human-held artifact), not merely outside the
  agent's write path *within* the same software system, which is all A achieves. This is a real, honest
  structural advantage of B.
- **But it only pays for itself against a threat model that includes "compromise of engine-side storage by
  something other than the resolved agent"** — and that is explicitly *not* the threat model this whole
  census was built against. Every named threat (T1/T2/T3/T5) is agent-side. Against agent-side forgery, A's
  "unwritable-by-agent file" already closes the hole completely; B's extra layer defends a flank nothing in
  the current design targets.

## 6. When B actually beats A — and the honest operational-cost verdict for a single-owner system

**B is overkill today. Recommend: build (a), park this document as the pre-designed ISO-3 upgrade path.**

The added cost B introduces, concretely:
- A private key is a **new class of secret** this project has no existing pattern for — `security.md`
  (global rule) explicitly forbids the agent from ever touching secret material; introducing key custody
  creates exactly the kind of asset that rule exists to keep out of the agent's reach, which means it also
  has to stay out of *every* automated path, including well-intentioned tooling.
- A signing ceremony (keygen, cert construction, canonicalization, Ed25519 sign) is **more code and more
  process** than option (a)'s entire mechanism (`hostId in Set<string>`) — for a system currently at
  187/187 tests and zero implementations of either port.
- Expiry monitoring/rotation becomes a **new silent-failure surface**: an expired cert either bricks the
  seam (if the resolver refuses correctly — the honest behavior) or, if built carelessly, degrades to
  `unverified` unnoticed — a new way to violate G3 (no default-rise of trust) that A structurally cannot
  produce (a static list either has the id or it doesn't; nothing "expires").
- **Читаемость cost is real and asked-for explicitly:** a flat `{hostId: allowed}` JSON is legible to the
  owner (or a future auditor) at a glance, no tooling required — matching the project's stated principle
  that everything must stay visible/legible to the human, epistemic status as a label not a wall
  (project `CLAUDE.md`: «всё видно ИИ … видно, что он делает»). A signature is opaque without a verify
  tool, a correctly-matched key file, and format literacy (JWS/Ed25519) — the opposite of legible. This is
  a direct, not incidental, cost against **Читаемость**.

**B beats A specifically when the seam-owner and the engine-writable-registry stop being the same trust
domain** — concretely:
- **Multi-host, no shared write-access to one central registry** — e.g. a third-party plugin host, a
  device the owner doesn't have filesystem parity with, a marketplace participant. A bare registry then
  needs either a live round-trip to a central store (an online dependency the current design has none of)
  or shipping the registry to the remote host — where that host, having full local read/write, could tamper
  with its own copy. Only a signature, checkable with a public key the remote host can't forge against,
  survives being stored somewhere the owner doesn't fully control.
- **Untrusted transport** — if the trust artifact must travel over a channel the owner doesn't already
  trust (network sync, third-party distribution, marketplace download), a signature lets the *receiving*
  verifier detect tampering in transit; a flat registry entry has no self-defense once it leaves storage
  the owner directly controls.
- This is exactly ADR-0011's own framing of ISO-3 as a **provisional endstate**, explicitly revisited "if
  the marketplace timeline changes," and explicitly rejected *as a first move* — "building the turnstile
  before the wall" (`ADR-0011:170-174`). Multi-host/untrusted-transport = marketplace/plugin hosts, and per
  ADR-0011 (`:100-103`) no Charter or Spec for marketplace exists yet — only a VISION-level intention. B has
  no host to protect today that A does not already protect equally well.

## 7. Seven-values pass (Суверенность / Доверие / Согласие; Читаемость called out separately per instruction)

- **Суверенность:** B keeps the root fully with the owner — the private key never leaves owner custody,
  which is a *cleaner* separation of "owner's real-world authority" from "engine's disk" than A (§5). But
  the operational sovereignty cost is real: every new host requires the owner to personally run a signing
  step, versus editing one line in a JSON list under A. More owner-labor per unit of sovereignty gained,
  and that gain is not yet spent on anything (no second trust domain exists to protect).
- **Доверие:** B's chain is verifiable independently of trusting the storage medium it currently sits on —
  useful the moment an artifact must be trusted *after* leaving its original, already-trusted location.
  For a single local engine journal read by the same single owner, this portability is never exercised;
  the trust property is real but currently unused.
- **Согласие:** both encode explicit owner consent — a registry entry (A) is consent-by-inclusion; a
  signed cert (B) is consent-by-signature, which is a stronger, less-forgeable act of will (a signature can
  only come from the one key; a list entry could in principle be added by anything with write access to
  that path, which is a slightly fuzzier form of "the owner consented" if that write path is ever automated
  later). Marginal edge to B here, but it is the smallest of the three gains.
- **Читаемость (explicit cost, not a value B advances):** worse under B, materially — see §6. This is the
  clearest, most concrete price of choosing B now, and it is a price paid immediately (every future audit
  of "who is a legitimate seam owner") in exchange for a threat-coverage gain (§5) that is not yet in scope.

## 8. Recommendation

Do not build B now. Adopt option (a) for decision 4 (matches `04-SYNTHESIS §6.4`'s existing recommendation
— this document independently reconfirms it, not merely repeats it). Keep this design as the **named
upgrade path**: the moment a second, less-trusted host or an untrusted transport enters the system (a real
marketplace/plugin Charter, not just VISION-intention), reopen this document — the `seamAuthority` field is
already A/B-neutral by construction (`05-spec §3.1` G-3), so the switch from (a)'s registry entry to (b)'s
cert reference is a resolver-implementation change, not a type or journal migration.

## 9. Open / not decided here

- Exact signature algorithm (Ed25519 assumed for size/speed/simplicity; not owner-ratified).
- Exact on-disk cert-store layout and file-naming — sketched in §1/§2, not finalized (would be finalized
  only if B is ever activated).
- Whether `scope` (namespace narrowing inside a `HostCert`) is ever needed — flagged as unused-at-first-cut,
  not designed further here; would recurse into the same P-3/G4 additive-shape discipline if it is.
