#!/usr/bin/env node
/**
 * md2tg — convert Markdown into a Telegram-ready message.
 *
 * Two modes:
 *   (default)  MarkdownV2  — bold/italic/code/links render; reserved chars escaped.
 *              Send with the reply tool using format: "markdownv2".
 *   --plain    Plain text  — MD stripped to readable text (never errors, no escaping).
 *              Send with format: "text" (the default).
 *
 * Usage:
 *   node md2tg.mjs [--plain] [file.md]      # file or stdin → stdout
 *   echo "**hi** 🎯" | node md2tg.mjs
 *
 * Emoji pass through untouched in both modes — put them straight in the MD.
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const plain = args.includes('--plain');
const file = args.find((a) => !a.startsWith('--'));
const src = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');

// --- MarkdownV2 escaping ----------------------------------------------------
const RESERVED = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
const escAll = (s) => s.replace(RESERVED, '\\$1');
const escCode = (s) => s.replace(/([`\\])/g, '\\$1');
const escUrl = (s) => s.replace(/([)\\])/g, '\\$1');

/** Inline tokenizer → MarkdownV2. Handles code, bold, italic, links; escapes the rest. */
function inlineMd2(text) {
  let out = '';
  let buf = '';
  const flush = () => {
    if (buf) {
      out += escAll(buf);
      buf = '';
    }
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if ((m = /^`([^`]+)`/.exec(rest))) {
      flush();
      out += '`' + escCode(m[1]) + '`';
    } else if ((m = /^\*\*([^*]+)\*\*/.exec(rest)) || (m = /^__([^_]+)__/.exec(rest))) {
      flush();
      out += '*' + escAll(m[1]) + '*';
    } else if ((m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest))) {
      flush();
      out += '[' + escAll(m[1]) + '](' + escUrl(m[2]) + ')';
    } else if ((m = /^\*([^*\n]+)\*/.exec(rest)) || (m = /^_([^_\n]+)_/.exec(rest))) {
      flush();
      out += '_' + escAll(m[1]) + '_';
    } else {
      buf += text[i];
      i += 1;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

/** Plain-text fallback: strip MD to readable text, keep emoji, no escaping. */
function inlinePlain(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_]/g, '$1$2');
}

function convert(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const res = [];
  let inFence = false;
  let fence = [];
  for (const line of lines) {
    if (/^```/.test(line)) {
      if (!inFence) {
        inFence = true;
        fence = [];
      } else {
        inFence = false;
        if (plain) res.push(fence.join('\n'));
        else res.push('```\n' + fence.map(escCode).join('\n') + '\n```');
      }
      continue;
    }
    if (inFence) {
      fence.push(line);
      continue;
    }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      // heading → bold line
      res.push(plain ? inlinePlain(m[2]) : '*' + escAll(m[2]) + '*');
    } else if (/^\s*([-*_])\1{2,}\s*$/.test(line) || /^\s*-{3,}\s*$/.test(line)) {
      res.push(plain ? '──────────' : escAll('──────────'));
    } else if ((m = /^(\s*)[-*+]\s+(.*)$/.exec(line))) {
      const inner = plain ? inlinePlain(m[2]) : inlineMd2(m[2]);
      res.push(m[1] + '• ' + inner);
    } else if ((m = /^(\s*)(\d+)\.\s+(.*)$/.exec(line))) {
      const inner = plain ? inlinePlain(m[3]) : inlineMd2(m[3]);
      res.push(m[1] + m[2] + (plain ? '. ' : '\\. ') + inner);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      const inner = plain ? inlinePlain(m[1]) : inlineMd2(m[1]);
      res.push('» ' + inner);
    } else if (line.trim() === '') {
      res.push('');
    } else {
      res.push(plain ? inlinePlain(line) : inlineMd2(line));
    }
  }
  return res.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

process.stdout.write(convert(src) + '\n');
