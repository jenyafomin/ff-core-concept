---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: design-note
title: U-2 — детерминированный хук doc-lint (нумерация R1 + Related-ссылки) — ПРЕДЛОЖЕНИЕ, НЕ установлено
Related:
  - ./SKILL-UPGRADE-PROPOSAL.md
  - ../maps/MAP-target.md
  - ../../PATCH-2026-07-17-conventions.md
  - ../../../../../.doc-types.json
---

# 🪝 U-2 — хук doc-lint (ПРЕДЛОЖЕНИЕ)

> ⚠️ **НЕ установлено.** Класс изменения **R2** (новый хук-enforcement; tool-allowlist не меняется) →
> по `rules/on-demand/evolution.md`: project overlay = **review recommended**, sandbox encouraged.
> `settings.json` этой сессией **не трогался**. Ниже — готовый к вставке сниппет + скрипт линта.
> Владелец решает: ставить в `.claude/settings.local.json` (проект) или отложить.

## Что делает
Детерминированно, ВНЕ ИИ-петли, на каждую запись/переезд файла под `docs/**` проверяет:
- **(a) R1-нумерация.** Именованная папка-концепт в пути обязана иметь префикс `NN-`; плюральные
  КОНТЕЙНЕРЫ (`analyses/ questions/ decisions/ plans/ states/`) и `_`-папки (`_shared/ _inbox/ _logs/`)
  обязаны быть БЕЗ номера. Нарушение → warn.
- **(b) Related-ссылки.** Парсит frontmatter `Related:` изменённого `.md`, резолвит каждый путь
  (относительно файла и относительно `docs/`); несуществующая цель → warn.

Снимает зависимость от внимания агента в момент max-нагрузки (корневая причина повторных ошибок —
R1 «по памяти»). Соответствует конституции: **хуки = enforcement вне ИИ-петли.**

## Режим
- **Дефолт — soft/warn (PostToolUse):** хук печатает предупреждения в stderr, НЕ блокирует запись.
  Совпадает с дефолтом скилла `soft`. Хук срабатывает ПОСЛЕ Write/Edit/MultiEdit.
- **Опционально strict (PreToolUse):** можно позже переключить на блокировку до записи
  (`permissionDecision: "deny"`); НЕ предлагается сейчас — двухфазный «строй»-гейт не ужесточаем.

## 1. Сниппет для `.claude/settings.local.json` (ПРОЕКТ, не глобал)

> Хук проектный, т.к. `docs/**` — проектное дерево. Вставить в объект `hooks` (создать ключ, если нет).
> Мёрджить с существующими хуками, НЕ перезаписывать файл целиком.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/doc-lint.mjs"
          }
        ]
      }
    ]
  }
}
```

Как это работает: Claude Code передаёт хуку на stdin JSON вида
`{ "tool_input": { "file_path": "…" }, "cwd": "…" }`. Скрипт сам фильтрует «только под `docs/**`
и только `.md`», иначе молча выходит с кодом 0 (no-op для не-doc записей).

## 2. Скрипт линта — `.claude/hooks/doc-lint.mjs`

> Node ≥ v18 (в системе v22.22.1 ✅). Без внешних зависимостей — парсер frontmatter минимальный,
> gray-matter НЕ требуется. Exit 0 всегда (warn-режим); предупреждения — в stderr.

```js
#!/usr/bin/env node
// doc-lint.mjs — U-2 warn-хук: R1-нумерация + резолв Related-ссылок под docs/**
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep, basename } from 'node:path';

const PLURAL_CONTAINERS = new Set(['analyses', 'questions', 'decisions', 'plans', 'states']);
const NUMBERED = /^\d{2,}-/;                     // 01-, 02-, …
const DATE_FIRST = /^\d{4}-\d{2}-\d{2}-/;        // trace/event files
const warns = [];

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readStdin();
let payload = {};
try { payload = JSON.parse(raw || '{}'); } catch { process.exit(0); }
const filePath = payload?.tool_input?.file_path;
if (!filePath) process.exit(0);

const abs = resolve(filePath);
const docsIdx = abs.split(sep).indexOf('docs');
if (docsIdx === -1) process.exit(0);            // not under docs/ → no-op
const rel = abs.split(sep).slice(docsIdx).join('/'); // docs/…/file

// ---- (a) R1 numbering: inspect folder segments below docs/ ----
const segs = rel.split('/').slice(1, -1);       // drop "docs" and filename
for (const s of segs) {
  if (s.startsWith('_')) continue;              // _shared/_inbox/_logs — no number, OK
  if (PLURAL_CONTAINERS.has(s)) {
    if (NUMBERED.test(s)) warns.push(`R1: плюрал-контейнер "${s}" НЕ должен иметь номер`);
    continue;
  }
  // named concept/theme folder → must be numbered (or date-first for trace)
  if (!NUMBERED.test(s) && !DATE_FIRST.test(s)) {
    warns.push(`R1: папка-концепт "${s}" без префикса NN- (либо это должен быть плюрал-контейнер)`);
  }
}

// ---- (b) Related: link resolution (only for .md) ----
if (abs.endsWith('.md') && existsSync(abs)) {
  const text = readFileSync(abs, 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const lines = fm[1].split('\n');
    const i = lines.findIndex(l => /^Related:\s*$/.test(l) || /^Related:\s*\[/.test(l));
    if (i !== -1) {
      const docsRoot = abs.split(sep).slice(0, docsIdx + 1).join(sep);
      for (let j = i + 1; j < lines.length; j++) {
        const m = lines[j].match(/^\s*-\s*(.+?)\s*$/);
        if (!m) break;                          // end of Related list
        let target = m[1].replace(/^['"]|['"]$/g, '').split(/\s+\(/)[0].trim();
        if (!target || target.startsWith('http')) continue;
        const p1 = resolve(dirname(abs), target);
        const p2 = resolve(docsRoot, target.replace(/^docs\//, ''));
        if (!existsSync(p1) && !existsSync(p2)) {
          warns.push(`Related: не резолвится "${target}" (от ${basename(abs)})`);
        }
      }
    }
  }
}

if (warns.length) {
  process.stderr.write(`\n⚠️ doc-lint (${rel}):\n` + warns.map(w => '  • ' + w).join('\n') + '\n');
}
process.exit(0);   // warn-режим: никогда не блокируем
```

## 3. Установка (владелец, вручную)
1. `mkdir -p .claude/hooks && <вставить скрипт> .claude/hooks/doc-lint.mjs`
2. Смёрджить сниппет `hooks.PostToolUse` в `.claude/settings.local.json` (не перезаписывать файл).
3. `/hooks` в интерактивной сессии — убедиться, что хук виден и matcher корректен.

## 4. Тест в изоляции (до боевого включения)
```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/docs/02-project/core/orchestration/README.md"}}' | node .claude/hooks/doc-lint.mjs
# ожидаем warn: R1 «orchestration» без префикса NN-
echo '{"tool_input":{"file_path":"'"$PWD"'/docs/02-project/core/01-brain/analyses/x.md"}}' | node .claude/hooks/doc-lint.mjs
# ожидаем тишину (analyses — плюрал-контейнер, ОК)
```

## 5. Откат (обратимость)
- Удалить ключ `hooks.PostToolUse` из `.claude/settings.local.json` + удалить `.claude/hooks/doc-lint.mjs`.
- git — точка восстановления. Хук не пишет и не двигает файлы, только читает и печатает → побочных эффектов нет.

## Границы / что НЕ делает
- НЕ блокирует (warn-only) — двухфазный «строй»-гейт нетронут (критик: ужесточаем ТОЛЬКО механическое).
- НЕ проверяет тип-суффиксы/дом по реестру (это следующая волна; здесь только нумерация + ссылки).
- НЕ трогает `docs/00-states/**`, `STATE.md`, `OPEN-ITEMS.md` содержательно — только читает их frontmatter при записи.
