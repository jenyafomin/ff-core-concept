#!/usr/bin/env node
// bundle-md.mjs — собирает несколько Markdown-файлов в ОДИН с оглавлением и разделителями.
// Назначение: отправлять результаты анализа в Telegram одним файлом, а не пачкой.
//
// Использование:
//   node tools/telegram/bundle-md.mjs [-o out.md] [-t "Заголовок"] file1.md file2.md ...
//   node tools/telegram/bundle-md.mjs -t "Стресс-тест" docs/council/raw/.../*.md
// Если -o не задан, путь печатается в stdout последней строкой (удобно для пайпа).
// Без -o файл пишется в системный temp с именем по заголовку.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
let out = null;
let title = 'Bundle';
const files = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-o' || a === '--out') out = argv[++i];
  else if (a === '-t' || a === '--title') title = argv[++i];
  else files.push(a);
}

if (files.length === 0) {
  console.error('Usage: node bundle-md.mjs [-o out.md] [-t "Title"] file1.md file2.md ...');
  process.exit(1);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Метка раздела для каждого файла = имя файла без расширения.
const sections = files.map((f) => {
  let content;
  try {
    content = readFileSync(f, 'utf8');
  } catch (e) {
    content = `> ⚠️ не удалось прочитать файл: ${e.message}`;
  }
  const name = basename(f).replace(/\.md$/i, '');
  return { name, anchor: slug(name), content: content.trimEnd(), path: f };
});

const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

const parts = [];
parts.push(`# ${title}`);
parts.push('');
parts.push(`> Собрано из ${sections.length} файлов · ${now} · \`tools/telegram/bundle-md.mjs\``);
parts.push('');
parts.push('## Оглавление');
sections.forEach((s, i) => parts.push(`${i + 1}. [${s.name}](#${s.anchor}) — \`${s.path}\``));
parts.push('');
sections.forEach((s) => {
  parts.push('');
  parts.push('---');
  parts.push('');
  parts.push(`<a id="${s.anchor}"></a>`);
  parts.push(`## ${s.name}`);
  parts.push(`> Источник: \`${s.path}\``);
  parts.push('');
  parts.push(s.content);
  parts.push('');
});

const bundled = parts.join('\n') + '\n';

if (!out) {
  out = join(tmpdir(), `bundle-${slug(title)}.md`);
}
writeFileSync(out, bundled, 'utf8');
console.log(out);
