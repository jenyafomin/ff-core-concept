#!/usr/bin/env node
// run-growth.mjs — GROWTH KILLER-RUN. Proves the system grows by DATA, not code.
// Spec: docs/_log/2026-07-24-phase-0-gates/evolvability-under-growth.analysis.md §8.
//
// It injects into the already-proven 98-node corpus (nodes.json + nodes-cap.json):
//   1. a NEW reach scope  `team:squad-alpha`  (declared via ranking contract, reuses the space shape)
//   2. a NEW type WITH a live example  `meta:type/vendor:workout`   (И-2-valid → accept)
//   3. a NEW type WITHOUT an example    `meta:type/vendor:broken`    (И-2-invalid → reject)
//   4. a NEW predicate pair             `meta:pred/vendor:performed` (И-4, links workout into the graph)
//   5. scenario S13: registration gate — unauthorized register DENY, authorized ALLOW.
//
// HARD CONSTRAINT: reuse the resolver from run-capability.mjs WITHOUT editing that engine.
//
//   FINDING (reported up front, honestly): run-capability.mjs exposes NO import seam
//   (no `export`, and it calls process.exit() at top level), so its functions cannot be
//   imported. Two consequences, both handled without touching the engine:
//     A) NO-REGRESSION is proven with the LITERAL engine: run-growth transiently grows the
//        corpus on disk, spawns the UNMODIFIED `node run-capability.mjs` as a child process,
//        and asserts all 15 scenarios (S1–S12, L1–L3) return byte-identical FIXED results
//        pre- vs post-growth. The engine source SHA is asserted unchanged.
//     B) The growth-only checks (team layer, S13, И-2/И-4) are computed by a VERBATIM
//        re-derivation of the engine's three gate functions, CROSS-VALIDATED against the
//        engine's own stdout on 5 shared scenarios (X-VAL). If the re-derivation disagreed
//        with the engine, X-VAL fails loudly — so it is a trustworthy proxy, not a rewrite.
//   The engine LOGIC is unchanged (that is the load-bearing claim). The packaging gap —
//   "the engine needs an export seam to be importable" — is a cheap R1 refactor, NOT a
//   resolver-logic change, and is reported as a finding, not smoothed over.
//
// Run:  node run-growth.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const line = (s = "") => process.stdout.write(s + "\n");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

const ENGINE = join(HERE, "run-capability.mjs");
const CAP = join(HERE, "nodes-cap.json");
const BASE = JSON.parse(readFileSync(join(HERE, "nodes.json"), "utf8"));
const CAP_TEXT = readFileSync(CAP, "utf8");        // exact bytes, for guaranteed restore
const CAPJ = JSON.parse(CAP_TEXT);
const GROWTH = JSON.parse(readFileSync(join(HERE, "nodes-growth.json"), "utf8"));

const ALLOW = "allow", DENY = "deny", FIXED = "FIXED";
const engineShaBefore = sha(ENGINE);

// ── build the grown in-memory corpus (base + cap + growth) exactly as the engine would ──
const byId = new Map(BASE.nodes.map((n) => [n.id, n]));
for (const n of CAPJ.nodes) byId.set(n.id, n);
for (const n of GROWTH.nodes) byId.set(n.id, n);
for (const ae of [...(CAPJ.add_edges || []), ...(GROWTH.add_edges || [])]) {
  const h = byId.get(ae.from); if (h) h.edges = [...(h.edges || []), ae.edge];
}
const NODES = [...byId.values()];
const CONSTITUTION = byId.get("policy:constitution");

// ═══════════════════════════════════════════════════════════════════════════════════════
// VERBATIM RE-DERIVATION of run-capability.mjs's gate functions (copied, not edited).
// Cross-validated against the engine below (X-VAL). Any drift => X-VAL fails.
// ═══════════════════════════════════════════════════════════════════════════════════════
function capMatch(pat, cap) { if (pat === cap) return true; if (pat.endsWith("*")) return cap.startsWith(pat.slice(0, -1)); return false; }
const subjMatch = (pat, s) => capMatch(pat, s);
function scopeCovers(inScope, scope) {
  if (inScope === scope || inScope === "*") return true;
  const s = byId.get(scope);
  if (s && (s.type === "space" || s.type === "team")) {
    const b = (s.edges || []).find((e) => e.predicate === "binds-to");
    if (b && b.target === inScope) return true;
  }
  return false;
}
const inAllowlist = (list, v) => (list || []).some((p) => subjMatch(p, v));
function spaceOf(node) { const sid = node.body?.space || (node.edges || []).find((e) => e.predicate === "occurs-in")?.target; return sid ? byId.get(sid) : null; }
function projectOf(x) { if (typeof x === "string") return x; return x.body?.tenant || "project:ff"; }
function granterHasManageGrants(minter, scope) {
  return NODES.some((g) => g.type === "grant" && g.body.minted_by === "system"
    && subjMatch(g.body.subject, minter) && scopeCovers(g.body.in_scope, scope)
    && (g.body.allow || []).some((p) => capMatch(p, "core:manage-grants")));
}
function grantValid(g) { if (g.body.minted_by === "system" || g.body.minted_by === "engine") return true; return granterHasManageGrants(g.body.minted_by, g.body.in_scope); }
function holdsCapability(viewer, cap, scope) {
  const grants = NODES.filter((g) => g.type === "grant" && subjMatch(g.body.subject, viewer) && scopeCovers(g.body.in_scope, scope) && grantValid(g));
  let allow = false, deny = false;
  for (const g of grants) { if ((g.body.allow || []).some((p) => capMatch(p, cap))) allow = true; if ((g.body.deny || []).some((p) => capMatch(p, cap))) deny = true; }
  if (deny) return false; if (allow) return true; return false;   // FIXED semantics (deny-wins, default-deny floor)
}
function canWriteAccessFields(viewer, node) { return holdsCapability(viewer, "core:manage-access", projectOf(node)) ? ALLOW : DENY; }
function canWriteNamespace(viewer, targetId) {
  const prot = (CONSTITUTION.body.protected_namespaces || []).some((ns) => targetId.startsWith(ns));
  if (!prot) return ALLOW;
  return holdsCapability(viewer, "core:manage-core", "project:ff") ? ALLOW : DENY;
}
function writeStack(viewer, node) {
  const stack = [];
  stack.push({ layer: "node", authority: "node", value: inAllowlist(node.access?.can_write, viewer) ? ALLOW : null });
  const space = spaceOf(node);   // type-blind: returns a space OR a team OR any container carrying policy_*
  if (space) {
    const ov = space.body?.policy_overrides?.[viewer];
    if (ov && ov.write) stack.push({ layer: "container.override", authority: ov.authority || "admin", value: ov.write });
    const def = space.body?.policy_default?.write;
    if (def) stack.push({ layer: "container.default", authority: "space", value: def });
  }
  return stack;
}
function resolveWrite(viewer, node, opts = {}) {
  const field = opts.field;
  const isControlField = field && (field.startsWith("access") || field.startsWith("visibility"));
  if (isControlField && canWriteAccessFields(viewer, node) === DENY) return DENY;
  const stack = writeStack(viewer, node);
  let reach = null;
  for (const s of stack) { if (s.value === DENY && (s.authority === "admin" || s.authority === "constitution")) continue; if (s.value) { reach = s.value; break; } }
  const adminDeny = stack.some((s) => s.authority === "admin" && s.value === DENY);
  const constDeny = (CONSTITUTION.body.protected_namespaces || []).some((ns) => node.id.startsWith(ns));
  if (constDeny) return DENY; if (adminDeny) return DENY; return reach || DENY;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// И-2 / И-4 mechanical lint — the enforcement artifact the analysis says is missing (R2/R5).
// ═══════════════════════════════════════════════════════════════════════════════════════
const META_LAYER = new Set(["type", "predicate", "envelope"]);   // fixpoint layer — exempt from example rule
function lintType(metaTypeNode) {
  // И-2: a domain meta:type/* is valid iff it has at least one live `example→` edge.
  const isMetaType = metaTypeNode.type === "type" && metaTypeNode.id.startsWith("meta:type/");
  if (!isMetaType) return { ok: false, reason: "not a meta:type/* node" };
  const name = metaTypeNode.body?.name;
  if (META_LAYER.has(name)) return { ok: true, reason: "meta-layer fixpoint (exempt)" };
  const ex = (metaTypeNode.edges || []).find((e) => e.predicate === "example");
  if (!ex) return { ok: false, reason: "И-2 VIOLATION: no example edge (unproven type)" };
  if (!byId.has(ex.target)) return { ok: false, reason: `example target ${ex.target} does not exist` };
  return { ok: true, reason: `example → ${ex.target}` };
}
function lintPredicatesDeclared() {
  // И-4: every edge predicate used in the corpus must be declared as a pair (meta:pred with name+inverse).
  const declared = new Set(NODES.filter((n) => n.type === "predicate").map((n) => n.body?.name));
  const undeclared = [];
  for (const n of NODES) for (const e of n.edges || []) if (!declared.has(e.predicate)) undeclared.push(`${n.id} --${e.predicate}-->`);
  return { declared, undeclared };
}

// ── parse the engine's scenario table from stdout: {S1:{expect,fixed}, ...} ──
function parseEngine(stdout) {
  const out = {};
  for (const l of stdout.split("\n")) {
    const m = l.match(/^((?:S\d{1,2}|L\d)) /);
    if (!m) continue;
    const key = m[1];
    // FIXED/NAIVE are the PARENTHESIZED tags (allow(ok)/deny(BREACH)/…); robust to long names gluing to EXPECT.
    const tagged = [...l.matchAll(/(allow|deny)\((?:ok|BREACH|!!)\)/g)].map((x) => x[1]);
    if (tagged.length >= 2) out[key] = { fixed: tagged[tagged.length - 1] };
  }
  const passed = (stdout.match(/FIXED passed (\d+)\/(\d+)/) || [])[0] || "?";
  return { rows: out, passed };
}
function runEngine() {
  try { return execFileSync("node", ["run-capability.mjs"], { cwd: HERE, encoding: "utf8" }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }   // engine exits 1 on FIXED-fail; still capture
}

// ── main ──
line("═".repeat(96));
line("GROWTH KILLER-RUN — prove the system grows by DATA, not code (evolvability §8)");
line(`base ${BASE.nodes.length} + cap ${CAPJ.nodes.length} + growth ${GROWTH.nodes.length} = ${NODES.length} nodes in the grown corpus`);
line(`engine fingerprint (sha256/16): ${engineShaBefore}   [must be identical after the run]`);
line("═".repeat(96));

const results = {};   // key -> {name, expected, actual}
const add = (k, name, expected, actual) => { results[k] = { name, expected, actual }; };

// ── [A] NO-REGRESSION: literal unmodified engine, pre-growth vs post-growth ──
line("\n[A] NO-REGRESSION — run the UNMODIFIED engine on 98-node vs grown corpus, compare 15 scenarios:");
const baseline = parseEngine(runEngine());                       // ungrown (current nodes-cap.json)
let regressionNote = "";
let grown;
try {
  // transiently grow the corpus the engine reads (cap overlay += growth), then restore in finally.
  const merged = { ...CAPJ, nodes: [...CAPJ.nodes, ...GROWTH.nodes], add_edges: [...(CAPJ.add_edges || []), ...(GROWTH.add_edges || [])] };
  writeFileSync(CAP, JSON.stringify(merged, null, 2));
  grown = parseEngine(runEngine());
} finally {
  writeFileSync(CAP, CAP_TEXT);                                  // restore exact original bytes
}
const scenarioKeys = Object.keys(baseline.rows);
let regressed = [];
for (const k of scenarioKeys) {
  const b = baseline.rows[k]?.fixed, g = grown.rows[k]?.fixed;
  if (b !== g) regressed.push(`${k}(${b}->${g})`);
}
line(`    engine on 98 nodes : ${baseline.passed}`);
line(`    engine on grown    : ${grown.passed}`);
line(`    per-scenario FIXED result identical pre/post growth: ${regressed.length === 0 ? "YES (all 15)" : "NO — " + regressed.join(", ")}`);
add("A", "no-regression: 15 scenarios FIXED-identical after growth", "identical", regressed.length === 0 && /15\/15/.test(grown.passed) ? "identical" : "REGRESSED");

// ── [B] ENGINE UNCHANGED ──
const engineShaAfter = sha(ENGINE);
line("\n[B] ENGINE UNCHANGED — resolver source diff:");
line(`    run-capability.mjs sha before=${engineShaBefore} after=${engineShaAfter}  => ${engineShaBefore === engineShaAfter ? "engine code diff = EMPTY (growth is data-only)" : "ENGINE WAS MODIFIED (!!)"}`);
line(`    nodes-cap.json restored to original bytes: ${readFileSync(CAP, "utf8") === CAP_TEXT ? "YES (no trace left)" : "NO (!!)"}`);
add("B", "engine source unchanged (growth is data-only)", "unchanged", engineShaBefore === engineShaAfter ? "unchanged" : "MODIFIED");

// ── [X-VAL] re-derivation faithful to the engine on 5 shared scenarios ──
line("\n[X-VAL] re-derived gates vs engine stdout (must match, else growth-only results are untrustworthy):");
const mirror = {
  S1: resolveWrite("user:mallory", byId.get("node:contested-doc")),
  S2: holdsCapability("user:jenya", "core:external-irreversible", "space:topic-private") ? ALLOW : DENY,
  S5: canWriteNamespace("agent:vendor", "meta:type/type"),
  S11: resolveWrite("user:mallory", byId.get("node:contested-doc"), { field: "access.can_read" }),
  L2: holdsCapability("user:jenya", "core:trigger-agent", "project:ff") ? ALLOW : DENY,
};
let xmismatch = [];
for (const k of Object.keys(mirror)) {
  const eng = grown.rows[k]?.fixed;
  if (mirror[k] !== eng) xmismatch.push(`${k}(mirror=${mirror[k]} engine=${eng})`);
  line(`    ${k}: mirror=${mirror[k]}  engine=${eng}  ${mirror[k] === eng ? "✔" : "✗"}`);
}
add("X-VAL", "re-derivation matches engine on 5 shared scenarios", "match", xmismatch.length === 0 ? "match" : "MISMATCH");

// ── [G1] NEW reach scope (team) picked up by the unchanged writeStack (substitution case) ──
const g1 = resolveWrite("user:coach", byId.get("node:team-doc"));                 // team override → allow
const g1ctl = resolveWrite("user:coach", byId.get("node:contested-doc"));         // no team override → floor deny
line("\n[G1] NEW reach scope `team:squad-alpha` via unchanged writeStack:");
line(`    coach writes node:team-doc  (team grants) = ${g1}   |  control: coach writes node:contested-doc (no team) = ${g1ctl}`);
add("G1", "new reach scope (team) contributes by data", ALLOW, g1);

// ── [G2] grant scoped to the BRAND-NEW scope resolves via holdsCapability + scopeCovers ──
const g2 = holdsCapability("user:coach", "core:write-knowledge", "team:squad-alpha") ? ALLOW : DENY;
line("\n[G2] grant scoped to the new `team:` scope (authority axis is fully data-extensible):");
line(`    holdsCapability(user:coach, core:write-knowledge, team:squad-alpha) = ${g2}`);
add("G2", "grant on a brand-new scope resolves (no engine edit)", ALLOW, g2);

// ── [И-2] example-required lint: accept the exampled type, reject the example-less type ──
const i2ok = lintType(byId.get("meta:type/vendor:workout"));
const i2bad = lintType(byId.get("meta:type/vendor:broken"));
line("\n[И-2] example-required lint (the enforcement artifact the analysis says is missing):");
line(`    meta:type/vendor:workout : ${i2ok.ok ? "ACCEPT" : "REJECT"}  (${i2ok.reason})`);
line(`    meta:type/vendor:broken  : ${i2bad.ok ? "ACCEPT" : "REJECT"}  (${i2bad.reason})`);
add("И-2a", "И-2 accepts type WITH example", "ACCEPT", i2ok.ok ? "ACCEPT" : "REJECT");
add("И-2b", "И-2 rejects type WITHOUT example", "REJECT", i2bad.ok ? "ACCEPT" : "REJECT");

// ── [И-4] new predicate pair declared; no undeclared edges in the grown graph ──
const i4 = lintPredicatesDeclared();
const vendorPredDeclared = i4.declared.has("vendor:performed");
line("\n[И-4] predicate-pair lint on the grown graph:");
line(`    vendor:performed declared as a pair: ${vendorPredDeclared ? "YES" : "NO"}   undeclared edge predicates: ${i4.undeclared.length === 0 ? "none" : i4.undeclared.join(", ")}`);
add("И-4", "new predicate declared as pair + zero undeclared edges", "valid", vendorPredDeclared && i4.undeclared.length === 0 ? "valid" : "invalid");

// ── [S13] type/layer registration gate ──
const s13a = canWriteNamespace("agent:vendor", "meta:type/vendor:workout");         // unauthorized
const s13b = canWriteNamespace("user:jenya", "meta:type/vendor:workout");           // authorized (core:*)
line("\n[S13] type/scope-layer registration gate (analysis A3, R1):");
line(`    unauthorized agent:vendor registers meta:type/vendor:workout = ${s13a}`);
line(`    authorized  user:jenya  registers meta:type/vendor:workout = ${s13b}`);
add("S13a", "unauthorized type registration denied", DENY, s13a);
add("S13b", "authorized type registration allowed", ALLOW, s13b);

// ── table + verdict ──
line("\n" + "─".repeat(96));
line("CHECK".padEnd(12) + "WHAT".padEnd(56) + "EXPECT".padEnd(12) + "ACTUAL".padEnd(10) + "P");
line("─".repeat(96));
let allPass = true;
for (const k of Object.keys(results)) {
  const r = results[k]; const pass = String(r.actual) === String(r.expected); if (!pass) allPass = false;
  line(k.padEnd(12) + r.name.slice(0, 55).padEnd(56) + String(r.expected).padEnd(12) + String(r.actual).padEnd(10) + (pass ? "✔" : "✗"));
}
line("─".repeat(96));

line("\nKEY RESULT:");
line(`  • Engine source needed edits to accommodate the new layer/type/predicate? ${engineShaBefore === engineShaAfter ? "NO — zero edits (growth is pure data)." : "YES (!!)"}`);
line(`  • Example-less type correctly rejected by И-2? ${!i2bad.ok ? "YES" : "NO (!!)"}   Exampled type accepted? ${i2ok.ok ? "YES" : "NO"}`);
line(`  • 15 existing scenarios survived growth unmodified? ${regressed.length === 0 ? "YES (15/15 pre==post)" : "NO — " + regressed.join(", ")}`);

line("\nFINDINGS (honest, carried up):");
line("  F1 (packaging, R1): run-capability.mjs has no export seam + top-level process.exit, so it is not");
line("     importable. Growth-only checks use a VERBATIM re-derivation cross-validated against the engine");
line("     (X-VAL above). This is a data-only / logic-unchanged result, but a reusable engine should expose");
line("     its resolver as exports — cheap R1 refactor, no logic change.");
line("  F2 (reach cascade depth): the engine's writeStack walks exactly TWO ranks (node + ONE container).");
line("     A new scope of the SAME shape (team) SUBSTITUTES at the container rank with zero edits (proven,");
line("     G1). But a genuine 3-rank INSERTION (node > team > space simultaneously) is NOT expressible —");
line("     writeStack does not iterate a declared scope chain. The ranking-contract holds for the grant/");
line("     authority axis (G2, scopeCovers) and for reach-substitution, NOT yet for reach-insertion in the");
line("     write cascade. ADR-0004 must not claim full N-level reach insertion until writeStack loops a");
line("     declared chain (additive engine change, but it IS an engine change).");

line("\n" + "═".repeat(96));
if (allPass) line("VERDICT: growth is DATA-ONLY — engine unchanged, 15/15 preserved, new type/predicate/scope compose, И-2 enforces, S13 gates. (exit 0)");
else line("VERDICT: at least one growth check FAILED — see ✗ rows above. Honest negative result. (exit 1)");
line("═".repeat(96));

process.exit(allPass ? 0 : 1);
