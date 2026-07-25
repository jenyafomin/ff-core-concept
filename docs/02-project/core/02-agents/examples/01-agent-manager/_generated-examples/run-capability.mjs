#!/usr/bin/env node
// run-capability.mjs — KILLER-TEST for the FF agent-manager CAPABILITY / access design.
//
// Runs the critic's 10 killer-progon scenarios (docs/_log/2026-07-24-phase-0-gates/
// critic-boundary-ADR-0004.md, lines 188-218) through TWO resolution engines:
//
//   MODE-NAIVE     = the design exactly as written in the boundary doc:
//                    node-access at the TOP of the cascade, deny as the BOTTOM stack layer,
//                    module sets its own default:deny (data, opt-out-able),
//                    NO meta-capability gate on writing access fields or minting grants.
//
//   MODE-LSR-FIXED = the abstract-thinker's LSR primitive:
//                    resolve = clamp( fold( deref(stack) ) ) — deny-floor + Constitution-ceiling
//                    are CLAMPS applied AFTER the fold (order-independent VETO), not stack layers;
//                    PLUS a meta-capability gate: writing access/visibility and minting grants
//                    are THEMSELVES capability-gated (core:manage-access / manage-grants / manage-core).
//
// Composition proof: costTree(viewer) and visibleTo(viewer) BOTH route through the SAME resolve()
// (fixes the critic's cost-tree-has-no-viewer finding). Cost and access are one query mechanism.
//
// Honesty > beauty: expected outcome is derived from the security intent; PASS/FAIL is result==expected.
// A NAIVE breach shows the hole is real; a FIXED FAIL (if any) would be a genuine unresolved design gap.
//
// Reads nodes.json (real base) + nodes-cap.json (synthetic capability overlay). Writes nothing.
// Run:  node run-capability.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = JSON.parse(readFileSync(join(HERE, "nodes.json"), "utf8"));
const OVER = JSON.parse(readFileSync(join(HERE, "nodes-cap.json"), "utf8"));

// ── merge overlay onto the real corpus (overlay node replaces base by id; add_edges are non-destructive) ──
const byId = new Map(BASE.nodes.map((n) => [n.id, n]));
for (const n of OVER.nodes) byId.set(n.id, n);
for (const ae of OVER.add_edges || []) {
  const host = byId.get(ae.from);
  if (host) host.edges = [...(host.edges || []), ae.edge];
}
const NODES = [...byId.values()];
const line = (s = "") => process.stdout.write(s + "\n");

const NAIVE = "NAIVE";
const FIXED = "FIXED";
const ALLOW = "allow";
const DENY = "deny";

// ── inverse-edge index (same technique as run-view.mjs: store one side, compute the inverse) ──
const reverse = new Map();
for (const n of NODES) for (const e of n.edges || []) {
  if (!reverse.has(e.target)) reverse.set(e.target, []);
  reverse.get(e.target).push({ predicate: e.predicate, source: n.id });
}
const inverseSources = (t, p) => (reverse.get(t) || []).filter((r) => r.predicate === p).map((r) => r.source);

const CONSTITUTION = byId.get("policy:constitution");
const PRIORITY = byId.get("policy:access-priority");

// ── glob/prefix matching — engine-fixed grammar over the namespace (critic LOW/mirror #3) ──
function capMatch(pattern, cap) {
  if (pattern === cap) return true;
  if (pattern.endsWith("*")) return cap.startsWith(pattern.slice(0, -1));
  return false;
}
function subjMatch(pattern, subj) { return capMatch(pattern, subj); }

// ── scope containment: a project grant covers spaces bound to it ──
function scopeCovers(inScope, scope) {
  if (inScope === scope || inScope === "*") return true;
  const s = byId.get(scope);
  if (s && s.type === "space") {
    const binds = (s.edges || []).find((e) => e.predicate === "binds-to");
    if (binds && binds.target === inScope) return true;
  }
  return false;
}

// ── grant validity (meta-cap gate on MINTING — fixes escalation hole 2) ──
// FIXED: a grant is only valid if its minter is `system` or holds core:manage-grants via a SYSTEM grant.
function granterHasManageGrants(minter, scope) {
  return NODES.some((g) => g.type === "grant" && g.body.minted_by === "system"
    && subjMatch(g.body.subject, minter) && scopeCovers(g.body.in_scope, scope)
    && (g.body.allow || []).some((p) => capMatch(p, "core:manage-grants")));
}
function grantValid(g, mode) {
  if (mode === NAIVE) return true;                 // NAIVE: anyone with write can mint — no gate
  if (g.body.minted_by === "system" || g.body.minted_by === "engine") return true;
  return granterHasManageGrants(g.body.minted_by, g.body.in_scope);
}

// ── holdsCapability: resolve grants for (viewer, cap, scope). Within/cross-grant fold is data-driven. ──
function holdsCapability(viewer, cap, scope, mode) {
  const grants = NODES.filter((g) => g.type === "grant"
    && subjMatch(g.body.subject, viewer) && scopeCovers(g.body.in_scope, scope) && grantValid(g, mode));
  let allow = false, deny = false;
  for (const g of grants) {
    if ((g.body.allow || []).some((p) => capMatch(p, cap))) allow = true;
    if ((g.body.deny || []).some((p) => capMatch(p, cap))) deny = true;
  }
  const capNode = byId.get("meta:cap/" + cap);
  if (mode === FIXED) {
    // deny-wins (C4 VETO within/across grants) → then default-deny FLOOR. Module's default:allow is IGNORED.
    if (deny) return false;
    if (allow) return true;
    return false;                                   // engine floor: default-deny, non-negotiable
  } else {
    // NAIVE: allow-wins (deny arrays not consulted first); module-authored default:allow is honored.
    if (allow) return true;
    if (deny) return false;
    return capNode?.body.default === "allow";        // opt-out default-deny bypass
  }
}

// ── viewer matches a readable_by allowlist (flat check — the same one run-view used) ──
function inAllowlist(list, viewer) { return (list || []).some((p) => subjMatch(p, viewer)); }

// ── space that a node sits in ──
function spaceOf(node) {
  const sid = node.body?.space || (node.edges || []).find((e) => e.predicate === "occurs-in")?.target;
  return sid ? byId.get(sid) : null;
}
function projectOf(scopeOrNode) {
  if (typeof scopeOrNode === "string") return scopeOrNode;
  return scopeOrNode.body?.tenant || "project:ff";
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE RESOLVER — resolve(key, viewer, node) — ONE mechanism for read & write.
// FIXED:  effective = CLAMP_authority( OVERRIDE_reach( stack ), floor=deny, ceiling=Constitution )
// NAIVE:  effective = OVERRIDE( [node, space.override, space.default, project, module, DENY-floor-layer] )
// ═══════════════════════════════════════════════════════════════════════════════════════

// Build the ordered scope stack of contributions for a WRITE key on a node.
function writeStack(key, viewer, node) {
  const stack = [];
  stack.push({ layer: "node", authority: "node", value: inAllowlist(node.access?.can_write, viewer) ? ALLOW : null });
  const space = spaceOf(node);
  if (space) {
    const ov = space.body?.policy_overrides?.[viewer];
    if (ov && ov.write) stack.push({ layer: "space.override", authority: ov.authority || "admin", value: ov.write });
    const def = space.body?.policy_default?.write;
    if (def) stack.push({ layer: "space.default", authority: "space", value: def });
  }
  return stack;
}

function resolveWrite(key, viewer, node, mode, opts = {}) {
  const field = opts.field;
  // ── control-plane FIELD gate (wired into the write path, not decorative): writing access/visibility
  //    fields is ITSELF capability-gated in FIXED (fixes escalation hole 1 at the point of forgery). ──
  const isControlField = field && (field.startsWith("access") || field.startsWith("visibility"));
  if (isControlField && mode === FIXED && canWriteAccessFields(viewer, node, FIXED) === DENY) return DENY;

  const stack = writeStack(key, viewer, node);
  if (mode === NAIVE) {
    // node at TOP; first non-null wins; deny is merely the implicit bottom layer.
    for (const s of stack) if (s.value) return s.value;      // node ALLOW outranks admin space.override DENY
    return DENY;                                             // bottom floor only if nothing above spoke
  }
  // FIXED: OVERRIDE-fold the reach; authority DENIES are NOT consumed as reach (they are clamps), but
  //        authority ALLOWS participate as normal specificity layers — so the clamp is symmetric.
  let reach = null;
  for (const s of stack) {
    if (s.value === DENY && (s.authority === "admin" || s.authority === "constitution")) continue; // clamp, skip
    if (s.value) { reach = s.value; break; }
  }
  // CLAMP (order-independent, applied AFTER the fold):
  const adminDeny = stack.some((s) => s.authority === "admin" && s.value === DENY);
  const constDeny = (CONSTITUTION.body.protected_namespaces || []).some((ns) => node.id.startsWith(ns));
  if (constDeny) return DENY;          // Constitution ceiling
  if (adminDeny) return DENY;          // authority VETO clamp (deny direction)
  return reach || DENY;                // default-deny floor  (admin ALLOW reaches here honored)
}

function resolveRead(viewer, node, mode) {
  const reach = inAllowlist(node.visibility?.readable_by, viewer) || inAllowlist(node.access?.can_read, viewer);
  if (mode === NAIVE) return reach ? ALLOW : DENY;           // flat allowlist check, no clamps
  // FIXED clamps applied AFTER the reach fold:
  if ((CONSTITUTION.body.no_read || []).includes(node.id)) return DENY;   // Constitution no-read ceiling
  const tenant = node.body?.tenant;                                        // tenant isolation clamp (S8)
  if (tenant && !holdsCapability(viewer, "core:read", tenant, FIXED)) return DENY;
  return reach ? ALLOW : DENY;
}

// ── meta-capability gate on the CONTROL PLANE (fixes escalation holes 1, 2, 3) ──
function canWriteAccessFields(viewer, node, mode) {
  if (mode === NAIVE) return resolveWrite("write", viewer, node, NAIVE);   // only needs write-knowledge
  return holdsCapability(viewer, "core:manage-access", projectOf(node), FIXED) ? ALLOW : DENY;
}
function canMintGrant(minter, grant, mode) {
  if (mode === NAIVE) return ALLOW;                                        // ungated — anyone with write mints
  return holdsCapability(minter, "core:manage-grants", grant.body.in_scope, FIXED) ? ALLOW : DENY;
}
function canWriteNamespace(viewer, targetId, mode) {
  if (mode === NAIVE) return ALLOW;                                        // no namespace protection
  const protectedNs = (CONSTITUTION.body.protected_namespaces || []).some((ns) => targetId.startsWith(ns));
  if (!protectedNs) return ALLOW;
  return holdsCapability(viewer, "core:manage-core", "project:ff", FIXED) ? ALLOW : DENY;
}
function canMintCapability(minter, capName, mode) {
  if (mode === NAIVE) return ALLOW;                                        // frictionless minting
  const core = capName.startsWith("core:");
  const needed = core ? "core:manage-core" : "core:manage-grants";        // even vendor caps need a review authority
  return holdsCapability(minter, needed, "project:ff", FIXED) ? ALLOW : DENY;
}

// ── consent valve — FIXED cross-checks the capability's irreversible flag, not the node's self-declared string ──
function valveGate(action, mode) {
  const capNode = byId.get(action.body.capability);
  const irreversible = capNode?.body?.irreversible === true;
  if (mode === NAIVE) return action.visibility?.valve === "none" ? ALLOW : DENY;  // trusts the spoofable label
  if (!irreversible) return ALLOW;
  return action.body.consent_event ? ALLOW : DENY;                               // must have real consent
}

// ── delegation-chain capability (S9): NAIVE inherits parent grant; FIXED uses sub-agent's own narrowed grant ──
function delegatedCapability(sub, cap, parent, scope, mode) {
  if (mode === NAIVE) return holdsCapability(parent, cap, scope, NAIVE);   // confused deputy: full inheritance
  return holdsCapability(sub, cap, scope, FIXED);                          // narrowed: sub needs its own grant
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// COMPOSITION — costTree(viewer) and visibleTo(viewer) through the SAME resolveRead()
// ═══════════════════════════════════════════════════════════════════════════════════════
function ownCost(agentId) {
  return inverseSources(agentId, "measures")
    .map((sid) => byId.get(sid))
    .reduce((sum, snap) => sum + (snap?.body?.tokens || 0), 0);
}
// FIXED gates each snapshot through resolveRead; NAIVE (the real run-view bug) ignores the viewer entirely.
function ownCostGated(agentId, viewer, mode) {
  return inverseSources(agentId, "measures")
    .map((sid) => byId.get(sid))
    .filter((snap) => mode === NAIVE ? true : resolveRead(viewer, snap, FIXED) === ALLOW)
    .reduce((sum, snap) => sum + (snap?.body?.tokens || 0), 0);
}
function costTree(rootId, viewer, mode) {
  function walk(id) {
    const own = ownCostGated(id, viewer, mode);
    const kids = (byId.get(id).edges || []).filter((e) => e.predicate === "delegates-to").map((e) => e.target)
      // FIXED PRUNES whole branches the viewer cannot read — the id/edge must not appear at all, not be zeroed.
      .filter((t) => mode === NAIVE ? true : resolveRead(viewer, byId.get(t), FIXED) === ALLOW);
    const childRows = kids.map(walk);
    return { id, own, subtree: own + childRows.reduce((s, r) => s + r.subtree, 0), children: childRows };
  }
  return walk(rootId);
}
function treeIds(node) { return [node.id, ...node.children.flatMap(treeIds)]; }
function visibleTo(viewer, mode) {
  return NODES.filter((n) => resolveRead(viewer, n, mode) === ALLOW).map((n) => n.id);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE 10 KILLER SCENARIOS (+ 3 legitimate-access baselines) — each returns {expected, naive, fixed}
// ═══════════════════════════════════════════════════════════════════════════════════════
function run(mode) {
  const R = {};

  // S1 — cross-level cascade conflict: node.can_write allows mallory; admin space.override denies.
  R.S1 = resolveWrite("write", "user:mallory", byId.get("node:contested-doc"), mode);

  // S2 — within-grant conflict: grant:overlap allow[core:*] + deny[core:external-irreversible].
  R.S2 = holdsCapability("user:jenya", "core:external-irreversible", "space:topic-private", mode) ? ALLOW : DENY;

  // S3 — traversal crosses a visibility boundary: can the auditor's cost view see the secret snapshot?
  const secretVisible = ownCostGated("agent:explorer-secret", "agent:auditor", mode) > 0;
  R.S3 = secretVisible ? ALLOW : DENY;

  // S4 — self-escalation: mallory (write-knowledge only) mints grant:mallory-selfmint (core:*).
  R.S4 = canMintGrant("user:mallory", byId.get("grant:mallory-selfmint"), mode);

  // S5 — namespace write (И-3): vendor writes a core-namespace node (meta:type/type).
  R.S5 = canWriteNamespace("agent:vendor", "meta:type/type", mode);

  // S6 — consent valve: irreversible external action, valve spoofed "none", no consent event.
  R.S6 = valveGate(byId.get("action:wire-money"), mode);

  // S7 — default-deny for a module cap shipped with default:allow, used by a subject with NO grant.
  R.S7 = holdsCapability("agent:vendor", "finance:wire-transfer", "project:ff", mode) ? ALLOW : DENY;

  // S8 — multi-tenant isolation: main agent (grant only in project:ff) reads a project:other node.
  R.S8 = resolveRead("agent:ff-personal", byId.get("node:other-secret"), mode);

  // S9 — delegation chain: rogue sub tries core:external-irreversible; parent holds core:*.
  //      NOTE: tests resolver-correctness GIVEN a narrowed sub-grant — NOT automatic delegation attenuation.
  R.S9 = delegatedCapability("agent:rogue-sub", "core:external-irreversible", "agent:ff-personal", "project:ff", mode) ? ALLOW : DENY;

  // S10 — capability minting review: vendor mints meta:cap/vendor:delete-everything and it becomes usable.
  R.S10 = canMintCapability("agent:vendor", "vendor:delete-everything", mode);

  // S11 — FORGE access field via write-knowledge: mallory (write-knowledge only, NOT manage-access)
  //       writes a permissive access.can_read onto a node. Gate is wired INTO resolveWrite's write path.
  R.S11 = resolveWrite("write", "user:mallory", byId.get("node:contested-doc"), mode, { field: "access.can_read" });

  // S12 — tree-topology redaction: does the unauthorized viewer's costTree still REFERENCE the secret node?
  const leaked = treeIds(costTree("agent:ff-personal", "agent:auditor", mode)).includes("agent:explorer-secret");
  R.S12 = leaked ? ALLOW : DENY;   // ALLOW = id present (topology leak); DENY = redacted (absent)

  // L1 — legitimate: owner reads a public output.
  R.L1 = resolveRead("user:jenya", byId.get("output:msg-13types"), mode);
  // L2 — legitimate: owner holds core:trigger-agent via grant:jenya@ff:owner.
  R.L2 = holdsCapability("user:jenya", "core:trigger-agent", "project:ff", mode) ? ALLOW : DENY;
  // L3 — legitimate: an agent reads a normal snapshot (readable_by agent:*).
  R.L3 = resolveRead("agent:auditor", byId.get("snapshot:explorer-A"), mode);

  return R;
}

// scenario metadata: expected outcome + whether it is an attack (breach expected under NAIVE)
const META = {
  S1:  { expected: DENY,  attack: true,  hole: "hole#1 node-access outranks admin override", name: "cross-level cascade conflict (write)" },
  S2:  { expected: DENY,  attack: true,  hole: "within-grant deny ignored (unsafe tie)",     name: "within-grant allow/deny overlap" },
  S3:  { expected: DENY,  attack: true,  hole: "cost-tree has no viewer -> cross-scope leak", name: "traversal crosses visibility boundary" },
  S4:  { expected: DENY,  attack: true,  hole: "hole#2 grant-minting ungated (self-escalate)",name: "self-mint elevated grant" },
  S5:  { expected: DENY,  attack: true,  hole: "hole#3 core-namespace write ungated (И-3)",   name: "vendor writes core namespace" },
  S6:  { expected: DENY,  attack: true,  hole: "valve label trusted, not cross-checked",      name: "consent-valve spoofed 'none'" },
  S7:  { expected: DENY,  attack: true,  hole: "module opt-out of default-deny honored",       name: "default-deny bypass (module default:allow)" },
  S8:  { expected: DENY,  attack: true,  hole: "flat readable_by leaks across tenants",        name: "multi-tenant isolation" },
  S9:  { expected: DENY,  attack: true,  hole: "sub-agent inherits full parent grant",         name: "delegation-chain confused deputy" },
  S10: { expected: DENY,  attack: true,  hole: "capability minted & grantable with no review", name: "capability-minting review" },
  S11: { expected: DENY,  attack: true,  hole: "access-field forgeable by write-knowledge",     name: "forge access field via write-knowledge" },
  S12: { expected: DENY,  attack: true,  hole: "tree topology (id+edge) leaks to unauth viewer", name: "tree-topology redaction" },
  L1:  { expected: ALLOW, attack: false, hole: "-",                                            name: "LEGIT: owner reads public output" },
  L2:  { expected: ALLOW, attack: false, hole: "-",                                            name: "LEGIT: owner holds core:trigger-agent" },
  L3:  { expected: ALLOW, attack: false, hole: "-",                                            name: "LEGIT: agent reads normal snapshot" },
};

// ── main ──
line("═".repeat(96));
line("CAPABILITY KILLER-TEST — FF agent-manager access design (candidate ADR-0004)");
line(`corpus: real nodes.json (${BASE.nodes.length}) + synthetic capability overlay (${OVER.nodes.length}) = ${NODES.length} nodes`);
line("two engines: MODE-NAIVE (boundary doc as-written)  vs  MODE-LSR-FIXED (clamp-after-fold + meta-cap gate)");
line("═".repeat(96));

const naive = run(NAIVE);
const fixed = run(FIXED);

// composition evidence (S3) — print both totals concretely
line("\n[COMPOSITION] costTree(agent:auditor) — cost & access via the SAME resolveRead():");
const ctN = costTree("agent:ff-personal", "agent:auditor", NAIVE);
const ctF = costTree("agent:ff-personal", "agent:auditor", FIXED);
line(`    NAIVE  subtree total = ${ctN.subtree.toLocaleString("ru-RU")} ток.  (secret 99 999 LEAKED into total — cost-tree ignores viewer)`);
line(`    FIXED  subtree total = ${ctF.subtree.toLocaleString("ru-RU")} ток.  (secret excluded — each snapshot gated by resolveRead)`);
line(`    visibleTo(agent:auditor): NAIVE sees ${visibleTo("agent:auditor", NAIVE).length} nodes, FIXED sees ${visibleTo("agent:auditor", FIXED).length} nodes (same resolve).`);

// topology-redaction evidence (S12): the secret id must be ABSENT from the FIXED tree, not just zeroed.
line(`    tree ids NAIVE: [${treeIds(ctN).join(", ")}]`);
line(`    tree ids FIXED: [${treeIds(ctF).join(", ")}]   <- agent:explorer-secret pruned entirely`);

// clamp tested in BOTH directions
line("\n[CLAMP both directions] admin space.override on space:topic-private:");
line(`    DENY-dir: resolveWrite(user:mallory, node:contested-doc) → NAIVE=${resolveWrite("write", "user:mallory", byId.get("node:contested-doc"), NAIVE)}  FIXED=${resolveWrite("write", "user:mallory", byId.get("node:contested-doc"), FIXED)}  (admin deny beats node allow)`);
line(`    ALLOW-dir: resolveWrite(user:helper, node:contested-doc) → NAIVE=${resolveWrite("write", "user:helper", byId.get("node:contested-doc"), NAIVE)}  FIXED=${resolveWrite("write", "user:helper", byId.get("node:contested-doc"), FIXED)}  (admin allow honored though node grants nothing)`);

// constitution ceiling demo — even owner with core:* is clamped
line("\n[CEILING] Constitution no_read clamp applied AFTER the fold:");
line(`    user:jenya (owner, core:*) read node:sealed-diary  → NAIVE=${resolveRead("user:jenya", byId.get("node:sealed-diary"), NAIVE)}  FIXED=${resolveRead("user:jenya", byId.get("node:sealed-diary"), FIXED)}`);

// scenario table
line("\n" + "─".repeat(96));
line("SCENARIO".padEnd(42) + "EXPECT".padEnd(8) + "NAIVE".padEnd(14) + "FIXED".padEnd(14) + "N  F");
line("─".repeat(96));
let fixedAllPass = true;
const naiveHoles = [];
for (const k of Object.keys(META)) {
  const m = META[k];
  const nRes = naive[k], fRes = fixed[k];
  const nPass = nRes === m.expected, fPass = fRes === m.expected;
  if (!fPass) fixedAllPass = false;
  if (m.attack && !nPass) naiveHoles.push(m.hole);
  const tag = (res, isAttack) => {
    if (res === ALLOW && isAttack && res !== m.expected) return "allow(BREACH)";
    return res + (res === m.expected ? "(ok)" : "(!!)");
  };
  line(
    `${k} ${m.name}`.padEnd(42) +
    m.expected.padEnd(8) +
    tag(nRes, m.attack).padEnd(14) +
    tag(fRes, false).padEnd(14) +
    `${nPass ? "✔" : "✗"}  ${fPass ? "✔" : "✗"}`
  );
}
line("─".repeat(96));

// summary
const naivePass = Object.keys(META).filter((k) => naive[k] === META[k].expected).length;
const fixedPass = Object.keys(META).filter((k) => fixed[k] === META[k].expected).length;
const total = Object.keys(META).length;
line(`\nSUMMARY:  NAIVE passed ${naivePass}/${total}   |   FIXED passed ${fixedPass}/${total}`);
line(`\nHOLES OPENED BY NAIVE (breach under the boundary doc as-written):`);
if (naiveHoles.length === 0) line("    (none)");
for (const h of naiveHoles) line("    ✗ " + h);

line("\nRESIDUAL GAP (honest): S9 proves the resolver denies correctly GIVEN a narrowed sub-grant. It does");
line("    NOT prove automatic delegation attenuation (sub-grant = parent ∩ context) — that is engine work,");
line("    unmodelled here. If the narrower grant is simply never authored, this defense does not fire.");

line("\n" + "═".repeat(96));
if (fixedAllPass) {
  line("VERDICT: LSR-FIXED design HOLDS across all scenarios (exit 0). NAIVE opens " + naiveHoles.length + " holes.");
} else {
  const gaps = Object.keys(META).filter((k) => fixed[k] !== META[k].expected);
  line("VERDICT: FIXED design STILL FAILS: " + gaps.join(", ") + " — real unresolved design gap (exit 1).");
}
line("═".repeat(96));

process.exit(fixedAllPass ? 0 : 1);
