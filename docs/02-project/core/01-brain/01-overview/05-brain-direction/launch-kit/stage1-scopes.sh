#!/usr/bin/env bash
# stage1-scopes.sh — Stage 1 (roadmap 2026-10-20 §6 step 5): add the project scopes `ff` and `agents-manager`
# to the brain and give two Claude Code folders (cli bindings by absolute cwd) access. RUN BY THE OWNER, BY HAND.
#
#   bash stage1-scopes.sh            # DRY RUN (default): shows what would change, writes nothing
#   bash stage1-scopes.sh --apply    # backup .bak-<ts> → write configs → restart ff-brain (only if scopes changed) → checks
#
# Idempotent: a second --apply finds nothing to change and does not restart. Never deletes, never removes a scope
# or a binding; only ADDS (slugs are permanent — `ff`, `agents-manager`, forever).
#   service.json  scopes += ff, agents-manager   (kind project, pii none)            → needs a restart (genesis)
#   readers.json  cli[<FF>] : scopes ∪ {ff, agents-manager}, write:true, default_scope ff (personal kept as is)
#                 cli[<AM>] : scopes ∪ {ff, agents-manager}, write:false, personal:false (created if absent)
#                 readers.json is re-read by the running service on change (no restart needed for it).
# Prerequisite: RUNBOOK step 1 (launch-brain.sh) done → service.json + readers.json exist.
#
# Env overrides (tests/rehearsal only): FF_BRAIN_HOME (default ~/.ff-brain), FF_BRAIN_NODE, FF_ROOT, AM_ROOT,
#   RESTART_CMD (default "pm2 restart ff-brain"). With a non-default FF_BRAIN_HOME the default pm2 restart is refused.
set -euo pipefail

APPLY=0
case "${1:-}" in
  --apply) APPLY=1 ;;
  ""|--dry-run) APPLY=0 ;;
  *) printf 'usage: bash stage1-scopes.sh [--dry-run|--apply]\n' >&2; exit 64 ;;
esac

FF_ROOT="${FF_ROOT:-/Users/mac16/Documents/IT/Apps/FF-Personal-Managment}"
AM_ROOT="${AM_ROOT:-/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager}"
NODE_BIN="${FF_BRAIN_NODE:-/Users/mac16/.nvm/versions/node/v22.23.2/bin/node}"
DEFAULT_HOME="$HOME/.ff-brain"
BRAIN_HOME="${FF_BRAIN_HOME:-$DEFAULT_HOME}"
RESTART_CMD="${RESTART_CMD:-pm2 restart ff-brain}"
CLI="$FF_ROOT/packages/brain/dist/bin/ff-brain.js"
SVC="$BRAIN_HOME/service.json"
RDR="$BRAIN_HOME/readers.json"
TS="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   ok: %s\n' "$*"; }
warn() { printf '   WARN: %s\n' "$*"; }
die()  { printf '   STOP: %s\n' "$*" >&2; exit 1; }

say "0/5 Preconditions ($([[ $APPLY == 1 ]] && echo APPLY || echo DRY RUN))"
[[ -x "$NODE_BIN" ]] || die "no node at $NODE_BIN (set FF_BRAIN_NODE)"
[[ -d "$FF_ROOT" && -d "$AM_ROOT" ]] || die "FF_ROOT or AM_ROOT missing"
[[ -f "$SVC" ]] || die "$SVC missing — run RUNBOOK step 1 (launch-brain.sh) first"
[[ -f "$RDR" ]] || die "$RDR missing — run RUNBOOK step 1 (launch-brain.sh) first"
[[ -f "$CLI" ]] || die "$CLI missing — build first (launch-brain.sh does it)"
if [[ "$BRAIN_HOME" != "$DEFAULT_HOME" && "$RESTART_CMD" == "pm2 restart ff-brain" ]]; then
  die "FF_BRAIN_HOME is not the default home but RESTART_CMD is the live pm2 restart — refusing (set RESTART_CMD)"
fi
ok "home $BRAIN_HOME"

# Pure merge in node: prints a JSON plan {service:{changed,next}, readers:{changed,next}, notes:[]} — writes nothing.
PLAN="$("$NODE_BIN" - "$SVC" "$RDR" "$FF_ROOT" "$AM_ROOT" <<'NODE'
const fs = require('node:fs');
const [svcPath, rdrPath, ffRoot, amRoot] = process.argv.slice(2);
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.error(`STOP: ${p} is not valid JSON (${e.message})`); process.exit(3); } };
const svc = read(svcPath), rdr = read(rdrPath), notes = [];
const WANT = [
  { slug: 'ff', name: 'FF Personal Management', kind: 'project', pii: 'none' },
  { slug: 'agents-manager', name: 'agents-manager (шлюз)', kind: 'project', pii: 'none' },
];
const svcNext = JSON.parse(JSON.stringify(svc));
svcNext.scopes = Array.isArray(svcNext.scopes) ? svcNext.scopes : [];
for (const w of WANT) {
  const have = svcNext.scopes.find((s) => s && s.slug === w.slug);
  if (!have) { svcNext.scopes.push(w); notes.push(`service.json: + scope ${w.slug}`); continue; }
  if (have.kind !== w.kind) { console.error(`STOP: scope ${w.slug} exists with kind '${have.kind}' (want '${w.kind}') — a slug is permanent, decide by hand`); process.exit(4); }
  if (have.member_of && have.member_of.length) notes.push(`service.json: scope ${w.slug} has member_of ${JSON.stringify(have.member_of)} — kept as is`);
}
const rdrNext = JSON.parse(JSON.stringify(rdr));
rdrNext.cli = rdrNext.cli && typeof rdrNext.cli === 'object' ? rdrNext.cli : {};
const union = (a, b) => [...new Set([...(Array.isArray(a) ? a : []), ...b])];
const SCOPES = ['ff', 'agents-manager'];
const upsert = (cwd, mk, patch) => {
  const cur = rdrNext.cli[cwd];
  if (!cur) { rdrNext.cli[cwd] = mk(); notes.push(`readers.json: + cli[${cwd}]`); return; }
  const next = { ...cur, ...patch(cur) };
  if (JSON.stringify(next) !== JSON.stringify(cur)) { rdrNext.cli[cwd] = next; notes.push(`readers.json: ~ cli[${cwd}] ${JSON.stringify(cur)} → ${JSON.stringify(next)}`); }
};
upsert(ffRoot,
  () => ({ principal: `cli:${ffRoot}`, scopes: SCOPES, default_scope: 'ff', write: true, personal: false }),
  (c) => ({ scopes: union(c.scopes, SCOPES), write: true, default_scope: c.default_scope ?? 'ff' }));
upsert(amRoot,
  () => ({ principal: `cli:${amRoot}`, scopes: SCOPES, write: false, personal: false }),
  (c) => ({ scopes: union(c.scopes, SCOPES) }));
for (const k of Object.keys(rdrNext.chats ?? {})) if (!k.includes(':')) notes.push(`WARN readers.json: CHAT-LEVEL key "${k}" — memory open in every topic of that chat`);
const sChanged = JSON.stringify(svcNext) !== JSON.stringify(svc);
const rChanged = JSON.stringify(rdrNext) !== JSON.stringify(rdr);
process.stdout.write(JSON.stringify({ service: { changed: sChanged, next: svcNext }, readers: { changed: rChanged, next: rdrNext }, notes }));
NODE
)" || die "merge failed (see message above) — nothing was written"

field() { "$NODE_BIN" -e 'const p=JSON.parse(process.argv[1]);const v=process.argv[2].split(".").reduce((o,k)=>o[k],p);process.stdout.write(typeof v==="string"?v:JSON.stringify(v,null,2))' "$PLAN" "$1"; }
S_CHANGED="$(field service.changed)"
R_CHANGED="$(field readers.changed)"

say "1/5 Plan"
"$NODE_BIN" -e 'for (const n of JSON.parse(process.argv[1]).notes) console.log("   " + n)' "$PLAN"
[[ "$S_CHANGED" == false && "$R_CHANGED" == false ]] && ok "nothing to change (already applied)"

if [[ $APPLY == 0 ]]; then
  say "DRY RUN — nothing written. Would be:"
  [[ "$S_CHANGED" == true ]] && { echo "--- service.json (next)"; field service.next; echo; }
  [[ "$R_CHANGED" == true ]] && { echo "--- readers.json (next)"; field readers.next; echo; }
  printf '\nApply: bash %s --apply\n' "$0"
  exit 0
fi

CHANGED=0
[[ "$S_CHANGED" == true || "$R_CHANGED" == true ]] && CHANGED=1

say "2/5 Backups (.bak-$TS, 0600) — rollback = copy them back"
umask 077
if [[ $CHANGED == 1 ]]; then
  for f in "$SVC" "$RDR"; do
    ( set -o noclobber; cat "$f" > "$f.bak-$TS" ) && chmod 600 "$f.bak-$TS" && ok "$(basename "$f").bak-$TS"
  done
else
  ok "nothing changes — no backup, no write, no restart; only checks"
fi

# health acts BEFORE (to prove the scope acts landed); empty if the service is down
acts_now() { ( cd "$FF_ROOT" && "$NODE_BIN" "$CLI" health 2>/dev/null ) | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).acts??""))}catch{}})' || true; }
ACTS_BEFORE="$(acts_now)"

say "3/5 Write configs (atomic: tmp → mv, 0600)"
write_json() { local f="$1" key="$2"; field "$key" > "$f.tmp-$TS"; chmod 600 "$f.tmp-$TS"; mv "$f.tmp-$TS" "$f"; ok "wrote $(basename "$f")"; }
[[ "$R_CHANGED" == true ]] && write_json "$RDR" readers.next || ok "readers.json unchanged"
[[ "$S_CHANGED" == true ]] && write_json "$SVC" service.next || ok "service.json unchanged"

say "4/5 Restart ff-brain (only when scopes changed — genesis seeds them on start)"
if [[ "$S_CHANGED" == true ]]; then
  $RESTART_CMD
  for _ in $(seq 1 30); do [[ -S "$BRAIN_HOME/brain.sock" ]] && ( cd "$FF_ROOT" && "$NODE_BIN" "$CLI" health >/dev/null 2>&1 ) && break; sleep 1; done
else
  ok "no restart needed"
fi

say "5/5 Checks"
( cd "$FF_ROOT" && "$NODE_BIN" "$CLI" health ) || die "health failed — pm2 logs ff-brain --lines 50 ; rollback: copy .bak-$TS back + $RESTART_CMD"
ACTS_AFTER="$(acts_now)"
if [[ "$S_CHANGED" == true && -n "$ACTS_BEFORE" && -n "$ACTS_AFTER" ]]; then
  (( ACTS_AFTER >= ACTS_BEFORE + 2 )) && ok "acts $ACTS_BEFORE → $ACTS_AFTER (scope acts written)" \
    || warn "acts $ACTS_BEFORE → $ACTS_AFTER — expected +2 (scopes ff, agents-manager). Look: pm2 logs ff-brain --lines 50"
fi
( cd "$FF_ROOT" && "$NODE_BIN" "$CLI" stats >/dev/null ) && ok "FF folder is a known reader (stats ok)" || warn "stats from FF folder refused"
( cd "$AM_ROOT" && "$NODE_BIN" "$CLI" stats >/dev/null ) && ok "agents-manager folder is a known reader (stats ok)" || warn "stats from agents-manager folder refused"
[[ $CHANGED == 0 ]] && { printf '\nDone (already applied).\n'; exit 0; }
printf '\nDone. Rollback: cp "%s.bak-%s" "%s" ; cp "%s.bak-%s" "%s" ; %s\n' "$SVC" "$TS" "$SVC" "$RDR" "$TS" "$RDR" "$RESTART_CMD"
printf '(The scope NODES stay in the journal after a rollback — harmless: nobody can read them without a binding.)\n'
