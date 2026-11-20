#!/usr/bin/env node
// tools/brain-ingest/dry-run-docs.mjs — DRY-RUN: how a docs tree would land in ff-brain as document-ADDRESS units.
// READ-ONLY. Writes nothing to the brain, opens no socket. Body stays in git; the brain would hold
// source.ref + sha256 + metadata. PII scan reports COUNTS and file paths only — never matched values.
//
// Usage: node tools/brain-ingest/dry-run-docs.mjs <docsRoot> <scopeSlug> [--out report.json] [--repo-root <dir>]
//        [--owner-email-sha256 <hex>]   (an email whose sha256 matches is counted as `email_owner`, not `email_other`)
// Zero deps (node >= 20).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve, basename, sep } from 'node:path';

// ─── CLI ───────────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [docsRootArg, scope] = positional;
if (!docsRootArg || !scope) {
  console.error('usage: dry-run-docs.mjs <docsRoot> <scopeSlug> [--out file.json] [--repo-root dir]');
  process.exit(2);
}
const docsRoot = resolve(docsRootArg);
const repoRoot = resolve(opt('--repo-root') ?? dirname(docsRoot));
const ownerEmailSha = opt('--owner-email-sha256');
const outPath = opt('--out');

// ─── brain contract mirrors (packages/brain/src/contract.ts LIMITS / PATTERNS — read, not imported) ─
const SOURCE_REF_RE = /^[A-Za-z0-9._/:#-]+$/;
const SOURCE_REF_DIGIT_RUN = /\d{9,}/;
const SOURCE_REF_MAX = 200;
const LABEL_MAX = 60;

// ─── walk ──────────────────────────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['_log', '_logs', '_archived', 'node_modules', '.gateway', '.git']);
const SECRET_FILE = /^\.env(\..*)?$|\.pem$|\.key$|credentials|service-account|secret/i;
const files = [];
const skipped = { dirs: {}, secretLike: 0 };
(function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) {
        skipped.dirs[ent.name] = (skipped.dirs[ent.name] ?? 0) + 1;
        continue;
      }
      walk(p);
    } else if (ent.isFile()) {
      if (SECRET_FILE.test(ent.name)) { skipped.secretLike += 1; continue; } // never opened
      if (ent.name.endsWith('.md') || ent.name.endsWith('.concept.json')) files.push(p);
    }
  }
})(docsRoot);

// ─── parsing ───────────────────────────────────────────────────────────────────────────────────────
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  const fm = {};
  let lastKey = null;
  for (const line of text.slice(3, end).split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) {
      lastKey = kv[1].toLowerCase();
      fm[lastKey] = kv[2].trim().replace(/^["']|["']$/g, '');
      if (fm[lastKey] === '') fm[lastKey] = [];
    } else if (lastKey && /^\s*-\s+/.test(line)) {
      if (!Array.isArray(fm[lastKey])) fm[lastKey] = fm[lastKey] ? [fm[lastKey]] : [];
      fm[lastKey].push(line.replace(/^\s*-\s+/, '').trim());
    }
  }
  return fm;
}

// inline header forms: "- **Status:** x · **Owner:** y", "> Статус: x", "**Date:** 2026-…"
function inlineMeta(text) {
  const head = text.split('\n').slice(0, 40).join('\n');
  const grab = (re) => head.match(re)?.[1]?.trim();
  return {
    status: grab(/(?:\*\*)?(?:Status|Статус)(?:\*\*)?\s*:\s*(?:\*\*)?\s*([^\n·|]+)/i),
    date: grab(/(?:Date|Дата|Updated|Created|Создан|Обновл[её]н|Last updated)\s*(?:\*\*)?\s*:\s*(?:\*\*)?\s*(\d{4}-\d{2}-\d{2})/i),
    owner: grab(/(?:\*\*)?(?:Owner|Владелец)(?:\*\*)?\s*:\s*(?:\*\*)?\s*([^\n·|]+)/i),
    title: grab(/^#\s+(.+)$/m),
  };
}

const TYPE_SUFFIX = /\.([a-z][a-z-]*)\.(md|json)$/;
function proposeKind(rel, fm) {
  const name = basename(rel);
  const lower = rel.toLowerCase();
  const suf = name.match(TYPE_SUFFIX)?.[1];
  if (name.endsWith('.concept.json')) return { kind: 'concept', by: 'suffix' };
  if (suf && suf !== 'concept') return { kind: suf, by: 'suffix' };
  const fmType = typeof fm?.type === 'string' ? fm.type.toLowerCase() : undefined;
  if (fmType) return { kind: fmType, by: 'frontmatter' };
  const byName = [
    [/^adr-\d+/i, 'adr'], [/^spec[-_]/i, 'spec'], [/^plan[-_]|^plan\.md$/i, 'plan'], [/^tasks?[-_]/i, 'task-list'],
    [/handoff/i, 'handoff'], [/^(index|_index|readme|overview|navigation|state|start)/i, 'navigator'],
    [/synthesis|свод/i, 'synthesis'], [/^questions?/i, 'questions'], [/charter/i, 'charter'], [/risk/i, 'risk'],
    [/verification|^qa/i, 'qa'], [/^theses/i, 'theses'],
  ];
  for (const [re, k] of byName) if (re.test(name)) return { kind: k, by: 'filename' };
  const byDir = [
    [/\/adr\//, 'adr'], [/\/spec\//, 'spec'], [/\/plan(s)?\//, 'plan'], [/\/analyses\//, 'analysis'], [/\/ideas\//, 'idea'],
    [/\/decisions\//, 'decision'], [/\/questions\//, 'questions'], [/\/raw\//, 'raw-lens'], [/\/contra\//, 'objection'],
    [/\/dialogue\//, 'dialogue'], [/\/council\//, 'council'], [/\/research\//, 'research'], [/\/architecture\//, 'architecture'],
    [/\/qa\//, 'qa'], [/\/task\//, 'task-list'], [/\/discovery\//, 'research'], [/\/ba\//, 'analysis'], [/\/concept\//, 'concept-doc'],
    [/\/deploy\//, 'runbook'], [/\/product\//, 'product'],
  ];
  for (const [re, k] of byDir) if (re.test('/' + lower)) return { kind: k, by: 'folder' };
  return { kind: 'note', by: 'default' };
}

// Collapse the free-form kind zoo into a small proposed `u:doc.kind` vocabulary (raw kind kept in `kindRaw`).
const KIND_NORMAL = {
  question: 'question', questions: 'question', 'open-question': 'question',
  critic: 'critique', 'adversarial-critique': 'critique', verdict: 'critique', review: 'critique', finding: 'critique', objection: 'critique',
  synthesis: 'synthesis', overview: 'navigator', navigator: 'navigator', index: 'navigator', map: 'navigator', view: 'navigator', 'concept-navigator': 'navigator',
  decision: 'decision', decisions: 'decision', adr: 'adr', 'adr-draft': 'adr',
  spec: 'spec', impl: 'spec', design: 'design', architecture: 'design', 'architecture-research': 'research',
  analysis: 'analysis', census: 'analysis', coverage: 'analysis', report: 'analysis', research: 'research', 'competitor-research': 'research',
  idea: 'idea', insight: 'idea', proposal: 'idea', recommendation: 'idea', advisory: 'idea',
  plan: 'plan', 'task-list': 'plan', assignment: 'plan', 'green-conditions': 'plan',
  concept: 'concept', 'concept-doc': 'concept', product: 'product', charter: 'product', goal: 'product',
  rule: 'rule', process: 'rule', template: 'rule', runbook: 'runbook', qa: 'qa', risk: 'risk', theses: 'theses',
  'raw-lens': 'raw', council: 'raw', dialogue: 'raw', handoff: 'trace', note: 'note',
};
const normKind = (k) => KIND_NORMAL[k] ?? KIND_NORMAL[k.split(/[\s(]/)[0]] ?? 'other';

// ff-brain type the address would be written as (proposal — `u:doc` does not exist yet)
const BRAIN_TYPE = (kind) =>
  ({ decision: 'u:doc (+decision)', adr: 'u:doc (+decision)', trace: 'skip:trace', raw: 'skip:raw' })[kind] ?? 'u:doc';

function statusCategory(raw) {
  if (!raw) return 'unknown';
  const s = String(raw).toLowerCase();
  if (/archiv|supersed|obsolete|deprecat|\bcold\b|dropped|reframed|rejected|устар|архив/.test(s)) return 'cold';
  if (/✅|\bdone\b|pass|implemented|executed|recorded|mitigat|resolved|answered|complete|closed|готов|сделан/.test(s)) return 'done';
  if (/active|approved|accepted|in-progress|in progress|ready|doing|ratified|live|актив|одобр/.test(s)) return 'active';
  if (/draft|propos|todo|pending|open|review|candidate|experimental|clarif|planned|next|blocked|hotfix|🔥|❓|🔒|черн|wip/.test(s)) return 'open';
  return 'unknown';
}

const DATE_IN_PATH = /(\d{4}-\d{2}-\d{2})/;

function linksOf(text, fm, isJson) {
  const out = new Set();
  const add = (s) => {
    if (!s) return;
    const clean = s.trim().replace(/^<|>$/g, '').split('#')[0].split('?')[0];
    if (!clean || /^(https?:|mailto:)/.test(clean)) return;
    if (/\.(md|json)$/.test(clean)) out.add(clean);
  };
  if (isJson) {
    for (const m of text.matchAll(/"([^"\n]+\.(?:md|json))"/g)) add(m[1]);
    return out;
  }
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) add(decodeURI(safe(m[1])));
  const rel = fm?.related;
  const relItems = Array.isArray(rel) ? rel : typeof rel === 'string' ? [rel] : [];
  for (const item of relItems) for (const tok of item.split(/\s*[·,;]\s*|\s+/)) add(tok.replace(/[`*()[\]]/g, ''));
  return out;
}
function safe(s) { try { decodeURI(s); return s; } catch { return encodeURI(s); } }
function mentionsOf(text) {
  // backticked paths `docs/...md` / `.claude/...md` — weaker edges ("mentions"), counted apart from links
  const out = new Set();
  for (const m of text.matchAll(/`([^`\s]+\.(?:md|json))`/g)) out.add(m[1].split('#')[0]);
  return out;
}

function resolveLink(fromAbs, link) {
  const cands = link.startsWith('/')
    ? [link]
    : [resolve(dirname(fromAbs), link), resolve(repoRoot, link), resolve(docsRoot, link)];
  for (const c of cands) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

// ─── PII heuristics (counts only) ────────────────────────────────────────────────────────────────
const PII = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  phone: /(?:\+\d[\d\s()-]{9,16}\d)|(?:\b8[\s(-]\d{3}[\s)-]{1,2}\d{3}[\s-]\d{2}[\s-]\d{2}\b)/g,
  passport_or_license: /(?:паспорт|passport|ву\b|водительск|удостоверени|driver'?s? licen[cs]e|license no)[^\n]{0,40}?\b\d{2}\s?\d{2}\s?\d{6}\b/gi,
  person_near_role: /(?:клиент|арендатор|водител|арендодател|customer|renter|driver|client)[а-яёa-z]*[\s:—–-]{1,4}([А-ЯЁ][а-яё]{2,}\s[А-ЯЁ][а-яё]{2,}|[A-Z][a-z]{2,}\s[A-Z][a-z]{2,})/g,
  ipv4: /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g,
  long_id: /(?<![\w.-])-?\d{9,}(?![\w.])/g, // Telegram chat/user ids, account numbers
  secret_like: /\bsk-[A-Za-z0-9]{20,}|\bghp_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b|BEGIN [A-Z ]*PRIVATE KEY|\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g,
};
const sha = (s) => createHash('sha256').update(s).digest('hex');

// ─── main pass ────────────────────────────────────────────────────────────────────────────────────
const units = [];
const byAbs = new Map();
for (const abs of files) {
  const buf = readFileSync(abs);
  const text = buf.toString('utf8');
  const rel = relative(repoRoot, abs).split(sep).join('/');
  const isJson = abs.endsWith('.concept.json');
  let fm = null;
  let jsonMeta = {};
  if (isJson) {
    try {
      const j = JSON.parse(text);
      jsonMeta = { title: j.title ?? j.name ?? j.id, status: j.status, date: j.date ?? j.updated, type: j.type };
    } catch { jsonMeta = { parseError: true }; }
  } else fm = parseFrontmatter(text);
  const inl = isJson ? {} : inlineMeta(text);
  const statusRaw = (isJson ? jsonMeta.status : fm?.status) ?? inl.status;
  const date = (isJson ? jsonMeta.date : fm?.date ?? fm?.updated ?? fm?.created) ?? inl.date ?? rel.match(DATE_IN_PATH)?.[1];
  const title = (isJson ? jsonMeta.title : fm?.title) ?? inl.title ?? basename(rel);
  const { kind, by } = proposeKind(rel, fm ?? (jsonMeta.type ? { type: jsonMeta.type } : null));
  const pii = {};
  let ownerEmails = 0;
  for (const [k, re] of Object.entries(PII)) {
    const ms = [...text.matchAll(re)];
    if (k === 'email' && ownerEmailSha) {
      ownerEmails = ms.filter((m) => sha(m[0].toLowerCase()) === ownerEmailSha).length;
      pii.email_owner = ownerEmails;
      pii.email_other = ms.length - ownerEmails;
    } else pii[k] = ms.length;
  }
  const refProblems = [];
  if (!SOURCE_REF_RE.test(rel)) refProblems.push('charset');
  if (SOURCE_REF_DIGIT_RUN.test(rel)) refProblems.push('digit-run');
  if (rel.length > SOURCE_REF_MAX) refProblems.push('too-long');
  const cold = /deprecated|_archived|\/old[ /(]/i.test(rel);
  const u = {
    ref: rel,
    hash: sha(buf),
    bytes: buf.length,
    kind: normKind(kind),
    kindRaw: kind.slice(0, 40),
    kindBy: by,
    brainType: BRAIN_TYPE(normKind(kind)),
    hasFrontmatter: !!fm,
    statusRaw: statusRaw ? String(statusRaw).slice(0, 40) : null,
    statusCat: cold ? 'cold' : statusCategory(statusRaw),
    date: date ?? null,
    labelLen: String(title).length,
    owner: !!((isJson ? undefined : fm?.owner) ?? inl.owner),
    refProblems,
    pii,
    links: [...linksOf(text, fm, isJson)],
    mentions: [...mentionsOf(text)],
  };
  units.push(u);
  byAbs.set(abs, u);
}

// ─── edges ────────────────────────────────────────────────────────────────────────────────────────
const deg = new Map(units.map((u) => [u.ref, { out: 0, in: 0 }]));
let edges = 0, broken = 0, external = 0, mentionEdges = 0, mentionBroken = 0;
const brokenSamples = [];
const edgeKeys = new Set();
for (const [abs, u] of byAbs) {
  for (const [list, isMention] of [[u.links, false], [u.mentions, true]]) {
    for (const l of list) {
      const target = resolveLink(abs, l);
      if (!target) {
        if (isMention) mentionBroken += 1;
        else { broken += 1; if (brokenSamples.length < 15) brokenSamples.push(`${u.ref} → ${l}`); }
        continue;
      }
      const t = byAbs.get(target);
      if (!t) { external += 1; continue; } // resolves, but outside the unit set (skipped dir / other tree)
      if (t === u) continue;
      const key = `${u.ref}\u0000${t.ref}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      if (isMention) mentionEdges += 1; else edges += 1;
      deg.get(u.ref).out += 1;
      deg.get(t.ref).in += 1;
    }
  }
}

// ─── aggregate ────────────────────────────────────────────────────────────────────────────────────
const count = (f) => units.reduce((acc, u) => { const k = f(u); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const piiTotals = {};
const piiFiles = {};
for (const u of units) for (const [k, v] of Object.entries(u.pii)) {
  if (!v) continue;
  piiTotals[k] = (piiTotals[k] ?? 0) + v;
  (piiFiles[k] ??= []).push(u.ref);
}
const folderNodes = new Set(units.map((u) => dirname(u.ref)));
const dupHashes = Object.values(count((u) => u.hash)).filter((n) => n > 1).length;
const report = {
  dryRun: true,
  generatedAt: new Date().toISOString(),
  scope,
  docsRoot: relative(repoRoot, docsRoot) || '.',
  skipped,
  units: units.length,
  bytesTotal: units.reduce((s, u) => s + u.bytes, 0),
  folderNodes: folderNodes.size,
  byKind: sortObj(count((u) => u.kind)),
  kindRawDistinct: new Set(units.map((u) => u.kindRaw)).size,
  kindSource: sortObj(count((u) => u.kindBy)),
  byBrainType: sortObj(count((u) => u.brainType)),
  byStatusCategory: sortObj(count((u) => u.statusCat)),
  statusRawTop: Object.fromEntries(Object.entries(sortObj(count((u) => u.statusRaw ?? '∅'))).slice(0, 15)),
  withFrontmatter: units.filter((u) => u.hasFrontmatter).length,
  withDate: units.filter((u) => u.date).length,
  withOwner: units.filter((u) => u.owner).length,
  labelOver60: units.filter((u) => u.labelLen > LABEL_MAX).length,
  sourceRefInvalid: {
    total: units.filter((u) => u.refProblems.length).length,
    byProblem: count((u) => u.refProblems.join('+') || 'ok'),
    samples: units.filter((u) => u.refProblems.length).slice(0, 8).map((u) => u.ref),
  },
  duplicateContentHashes: dupHashes,
  edges: { links: edges, mentions: mentionEdges, brokenLinks: broken, brokenMentions: mentionBroken, resolvedOutsideUnitSet: external, brokenSamples },
  orphans: units.filter((u) => deg.get(u.ref).in + deg.get(u.ref).out === 0).length,
  topNodes: [...deg.entries()].sort((a, b) => b[1].in + b[1].out - (a[1].in + a[1].out)).slice(0, 12)
    .map(([ref, d]) => ({ ref, in: d.in, out: d.out })),
  pii: {
    note: 'heuristic COUNTS only; values are never emitted',
    totals: piiTotals,
    filesWithAny: units.filter((u) => Object.entries(u.pii).some(([k, v]) => v && k !== 'email_owner')).length,
    filesByKind: Object.fromEntries(Object.entries(piiFiles).map(([k, v]) => [k, { files: v.length, paths: v.slice(0, 25) }])),
  },
};

const json = JSON.stringify(report, null, 2);
if (outPath) {
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, json + '\n');
  console.error(`dry-run: ${report.units} units, ${edges} link-edges, ${broken} broken → ${outPath}`);
} else process.stdout.write(json + '\n');
