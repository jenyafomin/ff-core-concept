#!/usr/bin/env node
// concept-lint — enforces the "concept suffix law" (D-1, 2026-07-20).
// Any tracked *.concept.json MUST pass the gateway viewer's detectConcept:
//   (has type OR id) AND (has array steps OR paths).
// Mirrors agents-manager/.../concept-graph.util.ts → detectConcept.
// TRACE (handoff, conversation steps, applied-records) must NOT carry .concept.json.
//
// Usage:
//   node tools/lint/concept-lint.mjs            # lint all tracked *.concept.json
//   node tools/lint/concept-lint.mjs <files...> # lint given files (pre-commit staged set)
// Exit 1 if any file violates the law.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function detectConcept(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const hasType = typeof obj.type === 'string' && obj.type.trim() !== '';
  const hasId = typeof obj.id === 'string' && obj.id.trim() !== '';
  const hasSteps = Array.isArray(obj.steps);
  const hasPaths = Array.isArray(obj.paths);
  return (hasType || hasId) && (hasSteps || hasPaths);
}

const isConceptName = (f) => f.endsWith('.concept.json') || f === 'concept.json' || f.endsWith('/concept.json');

function listTrackedConcepts() {
  // ловим и "<x>.concept.json", и «голый» concept.json (навигатор conversation)
  const out = execSync('git ls-files "*concept.json"', { encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean).filter(isConceptName);
}

const argFiles = process.argv.slice(2).filter(isConceptName);
const files = argFiles.length ? argFiles : listTrackedConcepts();

const violations = [];
for (const f of files) {
  let json;
  try {
    json = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    violations.push({ f, why: `невалидный JSON: ${e.message}` });
    continue;
  }
  if (!detectConcept(json)) {
    const arrays = Object.keys(json || {}).filter((k) => Array.isArray(json[k]));
    violations.push({
      f,
      why: `не проходит detectConcept — нужны (type|id) И (steps[]|paths[]); есть массивы: ${arrays.join(', ') || '—'}`,
    });
  }
}

if (violations.length) {
  console.error('\n❌ concept-lint: закон суффикса D-1 нарушен ' + violations.length + ' файл(ами):\n');
  for (const v of violations) console.error(`  • ${v.f}\n    → ${v.why}`);
  console.error(
    '\nПочини: либо приведи к схеме {type|id, steps[]|paths[]}, либо переименуй trace в *.md (handoff/лог/запись — не визард).' +
      '\nЗакон: docs/.doc-types.json → conventions.conceptSuffixLaw\n',
  );
  process.exit(1);
}
console.log(`✅ concept-lint: ${files.length} *.concept.json — все проходят detectConcept.`);
