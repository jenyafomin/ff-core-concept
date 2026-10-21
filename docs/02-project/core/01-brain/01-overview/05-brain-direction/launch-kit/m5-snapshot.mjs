#!/usr/bin/env node
// m5-snapshot.mjs — M5 daily snapshot (roadmap 2026-10-20 §5): one JSON line per run with the brain's health +
// stats, appended to <metrics>/YYYY-MM-DD.jsonl (local date). Counts only — no labels, no bodies, no ids.
// The 7-day gate and the weekly summary are counted from these lines instead of from memory.
//
//   node m5-snapshot.mjs                 # snapshot now
//   node m5-snapshot.mjs --print         # print the line, do not append
//
// Identity = the FF folder (cli binding in readers.json) — the script runs the owner CLI with cwd = FF_ROOT.
// Service down → the line is still written with ok:false (a gap is data too). Exit 1 only if the file write fails.
// Env: FF_ROOT, FF_BRAIN_NODE, FF_BRAIN_METRICS (default <FF_ROOT>/docs/_log/ff-brain-metrics — gitignored trace),
//      FF_BRAIN_HOME (tests only).
//
// crontab line (NOT installed — owner decides; `crontab -e`, one line, daily 09:05):
//   5 9 * * * /Users/mac16/.nvm/versions/node/v22.23.2/bin/node /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/m5-snapshot.mjs >> /tmp/ff-brain-m5.log 2>&1
// macOS: cron needs Full Disk Access to read ~/Documents (System Settings → Privacy → Full Disk Access → /usr/sbin/cron),
// otherwise the log shows "Operation not permitted".
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FF_ROOT = process.env.FF_ROOT || '/Users/mac16/Documents/IT/Apps/FF-Personal-Managment';
const NODE = process.env.FF_BRAIN_NODE || process.execPath;
const DIR = process.env.FF_BRAIN_METRICS || join(FF_ROOT, 'docs/_log/ff-brain-metrics');
const CLI = join(FF_ROOT, 'packages/brain/dist/bin/ff-brain.js');

function cli(cmd) {
  const r = spawnSync(NODE, [CLI, cmd], { cwd: FF_ROOT, encoding: 'utf8', timeout: 10_000, env: process.env });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false, exit: r.status, error: (r.stderr || '').trim().split('\n')[0]?.slice(0, 200) || 'no output' };
  }
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const h = cli('health');
const s = h.ok ? cli('stats') : { ok: false, error: 'skipped: health not ok' };
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const line = {
  ts: now.toISOString(),
  ok: h.ok === true && s.ok === true,
  health: h.ok ? pick(h, ['acts', 'records', 'bad_lines', 'write_p95_ms', 'queue_depth', 'last_backup_at', 'uptime_s', 'contract']) : pick(h, ['ok', 'exit', 'error']),
  stats: s.ok ? pick(s, ['total', 'by_type', 'by_scope']) : pick(s, ['ok', 'exit', 'error']),
};
const out = JSON.stringify(line);
if (process.argv.includes('--print')) {
  console.log(out);
} else {
  try {
    mkdirSync(DIR, { recursive: true, mode: 0o700 });
    appendFileSync(join(DIR, `${day}.jsonl`), `${out}\n`, { mode: 0o600 });
    console.log(`m5: appended to ${join(DIR, `${day}.jsonl`)} (ok:${line.ok})`);
  } catch (e) {
    console.error(`m5: cannot write ${DIR}: ${e.message}`);
    process.exit(1);
  }
}
