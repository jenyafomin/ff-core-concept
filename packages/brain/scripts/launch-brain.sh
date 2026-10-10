#!/usr/bin/env bash
# launch-brain.sh — first launch of the ff-brain memory service. RUN BY THE OWNER, BY HAND, in a terminal.
#
#   bash packages/brain/scripts/launch-brain.sh
#
# Agents must NOT run this (the data dir is stop-listed for agents; creating it is the owner's action).
# Runbook: docs/_log/2026-10-05-personal-memory-launch/launch/RUNBOOK.md
#
# What it does (idempotent — safe to re-run; never overwrites, never deletes):
#   1. checks Node >=20 at the pinned path (pm2 daemon itself runs Node 18 — the brain must not)
#   2. builds @ff/core @ff/engine @ff/brain @ff/brain-mcp (tsc → dist)
#   3. creates the data dir (0700) and the backup mirror dir if missing
#   4. writes service.json ONLY if absent (genesis scopes + backup_mirror)
#   5. writes readers.json ONLY if absent (one per-topic binding with write:true + read-only CLI for stats)
#      — tokens (token / gateway.token / secret) are created by the service itself; we never touch them
#   6. pm2 start ecosystem.brain.config.cjs (skips if ff-brain is already online)
#   7. waits for the socket, prints pm2 status, logs and `health`
#   8. runs the gateway prompt importer with --dry-run and STOPS, printing the next commands
#
# Overrides (env): FF_BRAIN_NODE, OWNER_ID, CHAT_ID, TOPIC_ID, GW_ROOT, BRAIN_MIRROR.
# Topic candidates (chat -1004351636302): 56 = this FF/brain working topic (default), 7414 = «МОИ ЗАДАЧИ».
set -euo pipefail

FF_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GW_ROOT="${GW_ROOT:-/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager}"
NODE_BIN="${FF_BRAIN_NODE:-/Users/mac16/.nvm/versions/node/v22.23.2/bin/node}"
command -v pm2 >/dev/null 2>&1 || { printf "   STOP: pm2 not found in PATH\n" >&2; exit 1; }
BRAIN_HOME="$HOME/.ff-brain"            # fixed: the gateway looks here by default (GATEWAY_BRAIN_HOME)
BRAIN_MIRROR="${BRAIN_MIRROR:-$HOME/Backups/ff-brain-mirror}"
OWNER_ID="${OWNER_ID:-1112667160}"
CHAT_ID="${CHAT_ID:--1004351636302}"
TOPIC_ID="${TOPIC_ID:-56}"
SCOPE_SLUG="personal"
CONFIG="$FF_ROOT/packages/brain/ecosystem.brain.config.cjs"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   ok: %s\n' "$*"; }
warn() { printf '   WARN: %s\n' "$*"; }
die()  { printf '   STOP: %s\n' "$*" >&2; exit 1; }

if [[ -n "${FF_BRAIN_HOME:-}" && "${FF_BRAIN_HOME}" != "$BRAIN_HOME" ]]; then
  die "FF_BRAIN_HOME is set to a non-default dir; this launcher only supports the default home. Unset it."
fi

# ── 1. Node ──────────────────────────────────────────────────────────────────────────────────────────
say "1/8 Node at $NODE_BIN"
[[ -x "$NODE_BIN" ]] || die "no executable node at $NODE_BIN (set FF_BRAIN_NODE=/abs/path/to/node>=20)"
NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || die "node $("$NODE_BIN" -v) < 20"
ok "node $("$NODE_BIN" -v)"
export FF_BRAIN_NODE="$NODE_BIN"            # read by ecosystem.brain.config.cjs at `pm2 start`
export PATH="$(dirname "$NODE_BIN"):$PATH"  # npm / corepack from the same node

# ── 2. Build ─────────────────────────────────────────────────────────────────────────────────────────
say "2/8 Build brain packages (tsc)"
( cd "$FF_ROOT" && npm run build -w @ff/core -w @ff/engine -w @ff/brain -w @ff/brain-mcp >/dev/null )
[[ -f "$FF_ROOT/packages/brain/dist/bin/ff-brain-serve.js" ]] || die "brain dist missing after build"
[[ -f "$FF_ROOT/packages/brain-mcp/dist/index.js" ]] || die "brain-mcp dist missing after build"
ok "dist built"

# ── 3. Dirs ──────────────────────────────────────────────────────────────────────────────────────────
say "3/8 Data dir + backup mirror"
for d in "$BRAIN_HOME" "$BRAIN_MIRROR"; do
  if [[ -d "$d" ]]; then
    ok "exists: $d"
  else
    mkdir -p "$d" && chmod 700 "$d" && ok "created (0700): $d"
  fi
done

umask 077
# write_once <path> — stdin → file, only if the file does not exist (noclobber: never overwrites)
write_once() {
  local f="$1"
  if [[ -e "$f" ]]; then
    ok "kept existing $(basename "$f") (not overwritten)"
    cat >/dev/null
    return 0
  fi
  ( set -o noclobber; cat > "$f" )
  chmod 600 "$f"
  ok "wrote $(basename "$f") (0600)"
}

# ── 4. service.json ──────────────────────────────────────────────────────────────────────────────────
say "4/8 service.json (genesis scopes — additive later; a slug is permanent)"
write_once "$BRAIN_HOME/service.json" <<JSON
{
  "scopes": [
    { "slug": "$SCOPE_SLUG", "name": "Личное — дела владельца", "kind": "personal" }
  ],
  "backup_mirror": "$BRAIN_MIRROR"
}
JSON

# ── 5. readers.json ──────────────────────────────────────────────────────────────────────────────────
say "5/8 readers.json (bound PER TOPIC $CHAT_ID:$TOPIC_ID — never chat-level: that would open all topics)"
write_once "$BRAIN_HOME/readers.json" <<JSON
{
  "owner_id": "$OWNER_ID",
  "chats": {
    "$CHAT_ID:$TOPIC_ID": { "scopes": ["$SCOPE_SLUG"], "default_scope": "$SCOPE_SLUG", "write": true, "personal": true }
  },
  "cli": {
    "$FF_ROOT": { "principal": "cli:$FF_ROOT", "scopes": ["$SCOPE_SLUG"], "write": false, "personal": true }
  }
}
JSON
grep -q "\"$CHAT_ID:$TOPIC_ID\"" "$BRAIN_HOME/readers.json" \
  || warn "readers.json has no \"$CHAT_ID:$TOPIC_ID\" entry — that topic will get DEFAULT_DENY (edit by hand)"
grep -q "\"$CHAT_ID\"[[:space:]]*:" "$BRAIN_HOME/readers.json" \
  && warn "readers.json has a CHAT-LEVEL \"$CHAT_ID\" key — memory is open in EVERY topic of that group"

# ── 6. pm2 start ─────────────────────────────────────────────────────────────────────────────────────
say "6/8 pm2 start ff-brain (do NOT run pm2 update / pm2 kill — that restarts the live gateway agent)"
# pm2 status of ff-brain: online | stopped | errored | … | absent (jlist may be prefixed by an out-of-date banner)
pm2_status() {
  pm2 jlist 2>/dev/null | "$NODE_BIN" -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const i = s.indexOf("[{"); const a = i < 0 ? [] : JSON.parse(s.slice(i));
      const p = a.find((x) => x.name === "ff-brain"); process.stdout.write(p ? p.pm2_env.status : "absent");
    });'
}
STATUS="$(pm2_status)"
case "$STATUS" in
  online) ok "ff-brain already online — not restarting" ;;
  absent) ( cd "$FF_ROOT" && pm2 start "$CONFIG" ) ;;
  *) die "ff-brain is in pm2 with status '$STATUS'. Inspect: pm2 logs ff-brain --lines 50 ; then 'pm2 delete ff-brain' and re-run." ;;
esac
INTERP="$(pm2 jlist 2>/dev/null | "$NODE_BIN" -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const i = s.indexOf("[{"); const a = i < 0 ? [] : JSON.parse(s.slice(i));
    const p = a.find((x) => x.name === "ff-brain"); process.stdout.write(p ? String(p.pm2_env.exec_interpreter) : "");
  });')"
[[ "$INTERP" == "$NODE_BIN" ]] && ok "interpreter $INTERP" \
  || warn "pm2 interpreter is '$INTERP', expected $NODE_BIN (old entry? pm2 delete ff-brain + re-run)"

# ── 7. socket + status ───────────────────────────────────────────────────────────────────────────────
say "7/8 Waiting for the socket (≤30 s)"
for _ in $(seq 1 30); do [[ -S "$BRAIN_HOME/brain.sock" ]] && break; sleep 1; done
[[ -S "$BRAIN_HOME/brain.sock" ]] || die "no socket after 30 s — see: pm2 logs ff-brain --lines 50"
ok "socket up"
pm2 describe ff-brain | grep -E 'status|restarts|interpreter |script path' || true
pm2 logs ff-brain --nostream --lines 5 || true
( cd "$FF_ROOT" && "$NODE_BIN" packages/brain/dist/bin/ff-brain.js health ) || warn "health check failed"
for f in token gateway.token secret; do [[ -f "$BRAIN_HOME/$f" ]] && ok "service created $f" || warn "$f not created yet"; done

# ── 8. gateway importer (dry run only) ───────────────────────────────────────────────────────────────
say "8/8 Gateway prompt importer — DRY RUN (writes nothing)"
grep -q '"prompt:import"' "$GW_ROOT/package.json" || die "gateway has no prompt:import script (R1 not merged?)"
[[ -f "$BRAIN_HOME/gateway.token" ]] || die "gateway.token not created by the service — check pm2 logs ff-brain before importing"
( cd "$GW_ROOT" && corepack pnpm prompt:import --dry-run )

cat <<EOF

────────────────────────────────────────────────────────────────────────────────────────────────────
Brain is up. Expected above: "listening … acts 32+, bad_lines 0", health ok:true, dry-run "failed []".
NEXT (by hand, in this order — see RUNBOOK.md):
  pm2 save                                           # dump is stale; keeps ff-brain after reboot
  cd $GW_ROOT && corepack pnpm prompt:import         # real import; re-run → "unchanged"
  # add to $GW_ROOT/.env :
  #   GATEWAY_PROMPT_SOURCE=shadow
  #   GATEWAY_BRAIN_MCP=1
  pm2 restart agent
  pm2 logs agent --nostream --lines 200 | grep -E "ff-brain MCP|prompt-shadow"
Rollback: remove the two .env lines + pm2 restart agent ; pm2 stop ff-brain  (data dir stays intact)
EOF
