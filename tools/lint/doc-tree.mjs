#!/usr/bin/env node
// Генерируемый ВИД дерева docs/ (закон doc-tree №8: авто-вид > рукопись).
// Помечает каждую папку архетипом (numbered/plural/service/dated/named) и флагом 🔴,
// если в папке слишком много прямых файлов (нарушение «нет loose-файлов»).
// Запуск: node tools/lint/doc-tree.mjs  → пишет docs/_generated/doc-tree.view.md + сводку в stdout.

import { readdirSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';

const ROOT = 'docs';
const THRESH = 6;                       // >6 прямых файлов в не-контейнере = 🔴
const PLURAL = new Set(['analyses', 'questions', 'decisions', 'plans', 'ideas', 'maps', 'checks', 'scenarios', 'raw']);
const SKIP = new Set(['.git', 'node_modules']);

function classify(name) {
  if (name === '_log') return 'trace';
  if (name.startsWith('_')) return 'service';
  if (/^\d{4}-\d{2}-\d{2}/.test(name)) return 'dated';
  if (/^\d{1,2}-/.test(name)) return 'numbered';
  if (PLURAL.has(name)) return 'plural';
  return 'named';
}

function statusOf(dir, files) {
  const nav = files.find(f => /^(INDEX|README|state)\.md$/i.test(f));
  if (!nav) return '';
  try {
    const m = readFileSync(join(dir, nav), 'utf8').match(/^\s*[Ss]tatus:\s*(\S+)/m);
    return m ? m[1].toLowerCase() : '';
  } catch { return ''; }
}

const flagged = [];
const lines = [];
let totalDirs = 0, totalFiles = 0;

function render(dir, depth) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  const subdirs = entries.filter(e => e.isDirectory() && !SKIP.has(e.name)).map(e => e.name).sort();
  const files = entries.filter(e => e.isFile()).map(e => e.name).sort();
  totalDirs++; totalFiles += files.length;

  const name = basename(dir);
  const cls = classify(name);
  const isContainer = cls === 'plural' || cls === 'trace';
  const many = files.length > THRESH && !isContainer;
  const st = statusOf(dir, files);
  const stMark = st === 'superseded' || st === 'archived' ? ' 📦' : (st === 'active' || st === 'approved' ? ' 🟢' : '');
  const flag = many ? `  🔴 ${files.length} файлов — много (>${THRESH})` : '';
  const indent = '  '.repeat(depth);
  lines.push(`${indent}${name}/  [${files.length}f${subdirs.length ? ', ' + subdirs.length + 'd' : ''}] ${cls}${stMark}${flag}`);

  if (many) {
    flagged.push({ path: dir, n: files.length });
    for (const f of files) lines.push(`${indent}    · ${f}`);
  }
  for (const d of subdirs) render(join(dir, d), depth + 1);
}

render(ROOT, 0);

const header = [
  '# 🌳 doc-tree.view — генерируемое дерево docs/ (авто-вид)',
  '',
  '> Собран `tools/lint/doc-tree.mjs`. НЕ править руками — перегенерировать: `node tools/lint/doc-tree.mjs`.',
  `> Архетипы: numbered(ствол) · plural(контейнер) · service(_служебное) · trace(_log) · dated · named.`,
  `> 🔴 = в папке >${THRESH} прямых файлов (нарушение «нет loose-файлов»). Итого: ${totalDirs} папок, ${totalFiles} файлов.`,
  '',
  '## 🔴 Папки с перегрузом (везде, где много файлов — не должно быть)',
  flagged.length
    ? flagged.sort((a, b) => b.n - a.n).map(f => `- **${f.n}f** — \`${f.path}\``).join('\n')
    : '- (нет — дерево чистое)',
  '',
  '## Дерево',
  '```',
  ...lines,
  '```',
  '',
].join('\n');

mkdirSync(join(ROOT, '_generated'), { recursive: true });
writeFileSync(join(ROOT, '_generated', 'doc-tree.view.md'), header);

console.log(`doc-tree: ${totalDirs} папок, ${totalFiles} файлов. 🔴 перегруженных папок: ${flagged.length}`);
flagged.sort((a, b) => b.n - a.n).forEach(f => console.log(`  🔴 ${f.n}f  ${f.path}`));
console.log(`→ docs/_generated/doc-tree.view.md`);
