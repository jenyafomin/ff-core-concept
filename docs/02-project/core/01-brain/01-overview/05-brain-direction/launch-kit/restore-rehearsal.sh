#!/usr/bin/env bash
# restore-rehearsal.sh — rehearse «restore the brain from a backup» on a COPY (roadmap 2026-10-20 §6 step 8,
# RUNBOOK «Восстановление из бэкапа»). RUN BY THE OWNER, BY HAND. The live service, its journal, its configs and the
# backup mirror are only READ; everything happens in a fresh temp home with its own socket and token.
#
#   bash restore-rehearsal.sh                       # newest backup from <home>/backups
#   bash restore-rehearsal.sh --backup <file.jsonl> # a specific backup (e.g. from ~/Backups/ff-brain-mirror)
#   bash restore-rehearsal.sh --cleanup             # also delete the temp copy at the end (default: kept, path printed)
#
# PASS = sha256 OK · last line is JSON · the copy boots with bad_lines 0 · acts in the copy = lines in the backup
#        (+ genesis acts only if the backup predates a scope in service.json) · stats readable from the FF folder.
# The report also says how far the backup lags behind live (acts/records written after the last backup).
# Tip: a fresh backup is written on every service start — `pm2 restart ff-brain` first if you want lag 0.
#
# Env overrides (tests only): FF_BRAIN_HOME (live home, default ~/.ff-brain), FF_BRAIN_NODE, FF_ROOT.
set -euo pipefail

FF_ROOT="${FF_ROOT:-/Users/mac16/Documents/IT/Apps/FF-Personal-Managment}"
NODE_BIN="${FF_BRAIN_NODE:-/Users/mac16/.nvm/versions/node/v22.23.2/bin/node}"
LIVE="${FF_BRAIN_HOME:-$HOME/.ff-brain}"
SERVE="$FF_ROOT/packages/brain/dist/bin/ff-brain-serve.js"
CLI="$FF_ROOT/packages/brain/dist/bin/ff-brain.js"
BACKUP=""
CLEANUP=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup) BACKUP="${2:?--backup needs a file}"; shift 2 ;;
    --cleanup) CLEANUP=1; shift ;;
    *) printf 'usage: bash restore-rehearsal.sh [--backup file.jsonl] [--cleanup]\n' >&2; exit 64 ;;
  esac
done

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   ok: %s\n' "$*"; }
warn() { printf '   WARN: %s\n' "$*"; }
FAIL=0
bad()  { printf '   FAIL: %s\n' "$*"; FAIL=1; }
die()  { printf '   STOP: %s\n' "$*" >&2; exit 1; }
json() { "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],JSON.parse(s));process.stdout.write(v===undefined?"":typeof v==="string"?v:JSON.stringify(v))}catch{}})' "$1"; }

say "1/5 Pick and verify the backup (read-only)"
[[ -x "$NODE_BIN" && -f "$SERVE" && -f "$CLI" ]] || die "node or brain dist missing"
if [[ -z "$BACKUP" ]]; then
  BACKUP="$(ls -t "$LIVE"/backups/journal-2*.jsonl 2>/dev/null | head -1 || true)"
  [[ -n "$BACKUP" ]] || die "no backups in $LIVE/backups"
fi
[[ -f "$BACKUP" && -f "$BACKUP.sha256" ]] || die "backup or its .sha256 missing: $BACKUP"
( cd "$(dirname "$BACKUP")" && shasum -a 256 -c "$(basename "$BACKUP").sha256" >/dev/null ) && ok "sha256 OK $(basename "$BACKUP")" || die "sha256 mismatch — this backup is damaged, pick another (--backup)"
tail -n1 "$BACKUP" | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{JSON.parse(s)})' && ok "last line is valid JSON" || die "last line is not JSON (torn backup)"
LINES="$(grep -c . "$BACKUP")"
ok "acts in backup: $LINES"
MIRROR_DIR="$("$NODE_BIN" -e 'try{process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).backup_mirror||"")}catch{}' "$LIVE/service.json")"
if [[ -n "$MIRROR_DIR" ]]; then
  M="$MIRROR_DIR/$(basename "$BACKUP")"
  if [[ -f "$M" ]] && cmp -s "$M" "$BACKUP"; then ok "mirror holds the same file ($MIRROR_DIR)"; else warn "mirror has no identical copy of this backup ($MIRROR_DIR)"; fi
fi

say "2/5 Build a temp home from COPIES (live untouched)"
umask 077
TMP="$(mktemp -d /tmp/ff-brain-restore.XXXXXX)"
[[ "$TMP" != "$LIVE" ]] || die "temp home equals live home"
mkdir -p "$TMP/store"
cp "$BACKUP" "$TMP/store/journal.jsonl" && chmod 600 "$TMP/store/journal.jsonl"
# service.json WITHOUT backup_mirror — the copy must never write into the real mirror
"$NODE_BIN" -e 'const fs=require("fs");let c={};try{c=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch{};delete c.backup_mirror;fs.writeFileSync(process.argv[2],JSON.stringify(c,null,2),{mode:0o600})' "$LIVE/service.json" "$TMP/service.json"
[[ -f "$LIVE/readers.json" ]] && cp "$LIVE/readers.json" "$TMP/readers.json" && chmod 600 "$TMP/readers.json"
ok "temp home $TMP (journal + service.json w/o mirror + readers.json)"

say "3/5 Boot the copy on its own socket"
FF_BRAIN_HOME="$TMP" nohup "$NODE_BIN" "$SERVE" > "$TMP/serve.log" 2>&1 &
PID=$!
stop_copy() { kill "$PID" 2>/dev/null || true; for _ in $(seq 1 30); do kill -0 "$PID" 2>/dev/null || break; sleep 0.3; done; }
trap stop_copy EXIT
for _ in $(seq 1 30); do [[ -S "$TMP/brain.sock" ]] && break; kill -0 "$PID" 2>/dev/null || break; sleep 1; done
[[ -S "$TMP/brain.sock" ]] || { cat "$TMP/serve.log"; die "the copy did not start"; }
grep -m1 listening "$TMP/serve.log" | sed 's/^/   /'

say "4/5 Compare copy vs live"
H_COPY="$(cd "$FF_ROOT" && FF_BRAIN_HOME="$TMP" "$NODE_BIN" "$CLI" health || true)"
S_COPY="$(cd "$FF_ROOT" && FF_BRAIN_HOME="$TMP" "$NODE_BIN" "$CLI" stats || true)"
H_LIVE="$(cd "$FF_ROOT" && FF_BRAIN_HOME="$LIVE" "$NODE_BIN" "$CLI" health 2>/dev/null || true)"
S_LIVE="$(cd "$FF_ROOT" && FF_BRAIN_HOME="$LIVE" "$NODE_BIN" "$CLI" stats 2>/dev/null || true)"
A_COPY="$(json acts <<<"$H_COPY")"; BL="$(json bad_lines <<<"$H_COPY")"; A_LIVE="$(json acts <<<"$H_LIVE")"
[[ "$BL" == "0" ]] && ok "copy bad_lines 0" || bad "copy bad_lines '$BL'"
if [[ "$A_COPY" == "$LINES" ]]; then ok "copy acts $A_COPY = backup lines"
elif [[ -n "$A_COPY" && "$A_COPY" -gt "$LINES" ]]; then warn "copy acts $A_COPY > backup lines $LINES — genesis added scopes the backup did not have yet (expected if the backup predates stage1-scopes)"
else bad "copy acts '$A_COPY' vs backup lines $LINES"; fi
[[ "$(json ok <<<"$S_COPY")" == "true" ]] && ok "copy stats from the FF folder: total $(json total <<<"$S_COPY") · by_type $(json by_type <<<"$S_COPY")" || bad "copy stats refused: $S_COPY"
if [[ -n "$A_LIVE" ]]; then
  ok "live: acts $A_LIVE · total $(json total <<<"$S_LIVE") · by_type $(json by_type <<<"$S_LIVE")"
  (( A_LIVE >= LINES )) && ok "backup lag: $(( A_LIVE - LINES )) act(s) written after this backup" || warn "live has fewer acts than the backup?"
else
  warn "live service not reachable — comparison skipped (the rehearsal itself is still valid)"
fi

say "5/5 Stop the copy"
stop_copy; trap - EXIT
ok "copy stopped"
if [[ $CLEANUP == 1 ]]; then rm -rf -- "$TMP" && ok "temp copy deleted"; else ok "temp copy kept: $TMP (delete: rm -rf $TMP)"; fi
[[ $FAIL == 0 ]] && printf '\nREHEARSAL PASS — the real procedure is RUNBOOK «Восстановление из бэкапа» steps 1–7.\n' || { printf '\nREHEARSAL FAIL — see FAIL lines above; do not rely on this backup.\n'; exit 1; }
