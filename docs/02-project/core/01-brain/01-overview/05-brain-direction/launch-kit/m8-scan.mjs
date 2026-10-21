#!/usr/bin/env node
// m8-scan.mjs — M8 pre-write gate (roadmap 2026-10-20 §5/§8 door V7): scan what a brain record would expose
// (label + every string in fields, incl. text/summary) for secrets and PII BEFORE `record`. No hard_erase yet →
// a wrong write is forever, so this runs first and must print 0 BLOCK.
//
//   node m8-scan.mjs request.json            # the exact `record` request body (JSON file)
//   cat request.json | node m8-scan.mjs -    # same, from stdin
//   node m8-scan.mjs --label "…" --text "…"  # quick check of two strings
//   node m8-scan.mjs --self-test             # built-in cases (run after editing the rules)
//   add --strict to treat WARN as BLOCK
//
// Exit: 0 = no BLOCK (WARNs are for the owner's eyes) · 1 = BLOCK found (do not write) · 2 = usage/input error.
// Findings never echo the value: kind · where · first 2 chars · length.
// Heuristics, not a proof: the owner still reads label/summary (Stage 1 step 6).
import { readFileSync } from 'node:fs';

/** BLOCK: secrets and direct identifiers. Order matters only for reporting. */
const BLOCK = [
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['telegram-bot-token', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/],
  ['anthropic/openai-key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}/],
  ['github-token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['aws-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ['bearer', /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i],
  ['url-with-credentials', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i],
  // NB: JS `\b` is ASCII-only — Cyrillic words need Unicode lookarounds (`u` flag)
  ['secret-assignment', /(?<![\p{L}\p{N}_])(?:password|passwd|pwd|secret|token|api[_-]?key|пароль|токен|секрет)\s*[:=]\s*\S{4,}/iu],
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['telegram-chat-id', /(?:^|[^\d])-100\d{6,}/],
  ['long-hex', /\b[a-f0-9]{32,}\b/i],
  ['long-base64', /(?=[A-Za-z0-9+/_-]*[0-9])(?=[A-Za-z0-9+/_-]*[A-Z])(?=[A-Za-z0-9+/_-]*[a-z])[A-Za-z0-9+/_-]{40,}={0,2}/],
];

/** Same rule as the brain's source.ref check: a digit run ≥9, also after stripping phone separators. */
const DIGIT_RUN = /\d{9,}/;
const PHONE_SEP = /[\s\-().+]/g;

/** WARN: may be fine, the owner decides. */
const WARN = [
  ['handle', /(?:^|[\s(])@[A-Za-z0-9_]{4,}/],
  ['home-path', /\/(?:Users|home)\/[^/\s]+\//],
  ['ip-address', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ['phone-like-short', /\+\d[\d\s\-()]{6,}/],
  // «Имя Фамилия» with a typical surname ending — third persons are not allowed in label/summary (door V7)
  // (surname stem + any case ending: Петров/Петрова/Петровым/Петровой/Петровичу…)
  ['person-name?', /(?<![\p{L}])[А-ЯЁ][а-яё]{1,15}\s+[А-ЯЁ][а-яё]{1,20}(?:ов|ев|ёв|ин|ын|ск|цк|ко|ук|юк|ич|енко)(?:[а-яё]{0,3})(?![\p{L}])/u],
];

function strings(req) {
  const out = [];
  if (typeof req.label === 'string') out.push(['label', req.label]);
  const walk = (v, where) => {
    if (typeof v === 'string') out.push([where, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  walk(req.fields ?? {}, 'fields');
  return out;
}

const mask = (m) => `${m.slice(0, 2)}…(${m.length})`;

export function scan(req) {
  const findings = [];
  for (const [where, s] of strings(req)) {
    for (const [kind, re] of BLOCK) {
      const m = s.match(re);
      if (m) findings.push({ level: 'BLOCK', kind, where, hint: mask(m[0].trim()) });
    }
    const run = s.match(DIGIT_RUN) ?? s.replace(PHONE_SEP, '').match(DIGIT_RUN);
    if (run && !findings.some((f) => f.where === where && f.kind === 'telegram-chat-id')) {
      findings.push({ level: 'BLOCK', kind: 'digit-run>=9 (phone/id/card)', where, hint: mask(run[0]) });
    }
    for (const [kind, re] of WARN) {
      const m = s.match(re);
      if (m) findings.push({ level: 'WARN', kind, where, hint: mask(m[0].trim()) });
    }
  }
  return findings;
}

function selfTest() {
  const cases = [
    // [request, expected BLOCK count > 0?]
    [{ label: 'ADR-0016: один мозг на все проекты', fields: { text: 'Одна память на все проекты: сервис ff-brain вне репозиториев (pm2 + MCP). Проекты — области; агенты любых папок читают через find/read, текст остаётся в git.' } }, false],
    [{ label: 'Дата 2026-10-21, версия v22.23.2', fields: { text: 'ADR-0017, шаги 1–9' } }, false],
    [{ label: 'позвонить +7 (916) 123-45-67' }, true],
    [{ label: 'топик -1004351636302:56' }, true],
    [{ label: 'note', fields: { text: 'пароль: hunter2xx' } }, true],
    [{ label: 'note', fields: { text: 'mail me at a.b@example.com' } }, true],
    [{ label: 'note', fields: { text: 'key sk-ant-REDACTEDREDACTEDREDACTED' } }, true],
    [{ label: 'note', fields: { text: 'bot 1234567890:AAEhBP0av18S4b3rSxYqLtcLqOzrAAAAAAA' } }, true],
    [{ label: 'note', fields: { text: 'hash c253565f6141aaaaaaaaaaaaaaaaaaaaaaaa' } }, true],
    [{ label: 'note', fields: { text: 'postgres://u:p4ss@127.0.0.1:5433/db' } }, true],
  ];
  let bad = 0;
  for (const [req, wantBlock] of cases) {
    const got = scan(req).some((f) => f.level === 'BLOCK');
    if (got !== wantBlock) {
      bad += 1;
      console.log(`FAIL ${JSON.stringify(req.label)} → block=${got}, want ${wantBlock}`, scan(req));
    }
  }
  const warn = scan({ label: 'встреча с Иваном Петровым', fields: { text: 'см. /Users/someone/x' } }).filter((f) => f.level === 'WARN').length;
  if (warn < 1) { bad += 1; console.log('FAIL warn cases not detected'); }
  console.log(bad ? `self-test: ${bad} FAILED` : `self-test: ${cases.length + 1} cases OK`);
  process.exit(bad ? 1 : 0);
}

function main(argv) {
  const strict = argv.includes('--strict');
  const args = argv.filter((a) => a !== '--strict');
  if (args[0] === '--self-test') return selfTest();
  let req;
  try {
    if (args[0] === '--label' || args[0] === '--text') {
      req = { fields: {} };
      for (let i = 0; i < args.length; i += 2) {
        if (args[i] === '--label') req.label = args[i + 1] ?? '';
        else if (args[i] === '--text') req.fields.text = args[i + 1] ?? '';
        else throw new Error(`unknown arg ${args[i]}`);
      }
    } else if (args[0]) {
      req = JSON.parse(readFileSync(args[0] === '-' ? 0 : args[0], 'utf8'));
    } else throw new Error('no input');
  } catch (e) {
    console.error(`m8-scan: ${e.message}\nusage: node m8-scan.mjs <request.json|-> | --label "…" [--text "…"] | --self-test  [--strict]`);
    process.exit(2);
  }
  const findings = scan(req);
  for (const f of findings) console.log(`${f.level.padEnd(5)} ${f.kind} · ${f.where} · ${f.hint}`);
  const blocks = findings.filter((f) => f.level === 'BLOCK' || (strict && f.level === 'WARN')).length;
  const warns = findings.filter((f) => f.level === 'WARN').length;
  console.log(`M8: ${blocks} BLOCK · ${warns} WARN → ${blocks ? 'DO NOT WRITE' : 'ok to write (read label/summary yourself)'}`);
  process.exit(blocks ? 1 : 0);
}

main(process.argv.slice(2));
