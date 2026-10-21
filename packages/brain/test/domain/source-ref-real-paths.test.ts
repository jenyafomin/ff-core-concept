// Stage 1 (roadmap 2026-10-20 §6, door D-2): the `source.ref` format `repo:<registry key>/<path from repo root>`
// checked against REAL paths of the two repos of the first cross-project read (FF = `ff`, gateway =
// `agents-manager`). Pins what passes and what is refused TODAY, so the first record does not discover it live.
//
// Census of all tracked files on 2026-10-21 (same rules as validateSource):
//   ff             1780 files → 1733 pass · 33 refused (chat id in `.gateway/conversations/-100…`, correct)
//                                         · 10 refused (Cyrillic file names, expected until ADR-0019 NFC)
//                                         ·  4 refused ASCII FALSE POSITIVES (a digit right before a date:
//                                              `SYNTHESIS-01-2026-07-09`, `q5-2026-07-26`, `VERDICT2-2026-06-15`)
//   agents-manager 1012 files → 1012 pass
// The paths are a fixed list (deterministic); FF paths are also checked to exist in this checkout.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LIMITS } from '../../src/contract.js';
import { validateSource } from '../../src/domain/pii-scope.js';

const FF_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const ref = (key: 'ff' | 'agents-manager', path: string) => `repo:${key}/${path}`;
const check = (r: string) => validateSource({ kind: 'file', ref: r, hash: createHash('sha256').update(r).digest('hex') });

/** Real ASCII paths that must pass (the first document comes first). */
const PASS: Array<['ff' | 'agents-manager', string]> = [
  ['ff', 'docs/architecture/ADR/ADR-0016-cross-project-brain.md'],
  ['ff', 'docs/architecture/ADR/ADR-0017-type-layers-packs-storage-seam.md'],
  ['ff', 'docs/architecture/ADR/ADR-0018-gateway-log-reader.md'],
  ['ff', 'CLAUDE.md'],
  ['ff', 'docs/INDEX.md'],
  ['ff', 'packages/brain/src/contract.ts'],
  ['ff', 'packages/brain-mcp/src/contract.ts'],
  ['ff', 'docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/RUNBOOK.md'],
  ['ff', 'docs/02-project/core/01-brain/01-overview/05-brain-direction/analyses/2026-10-20-direction-and-roadmap/00-SYNTHESIS-and-ROADMAP.md'],
  ['ff', '.claude/rules/doc-tree.md'],
  ['agents-manager', 'CLAUDE.md'],
  ['agents-manager', 'README.md'],
  ['agents-manager', 'package.json'],
  ['agents-manager', 'src/core/policy/brain-home-guard.ts'],
  ['agents-manager', 'docs/architecture/ADR/ADR-0002-gateway-topic-and-reply-awareness.md'],
  ['agents-manager', 'docs/architecture/ADR/ADR-0002-access-roles-and-approval-policy.md'],
  ['agents-manager', 'docs/00-organization/cross-project-links.md'],
  ['agents-manager', 'docs/00-organization/session-handoff/2026-07-12-loop-engineering-repo-analysis/00-README.md'],
];

/** Real paths refused today — each with the reason; changing any of these is a decision (ADR-0019), not a fix. */
const REFUSED: Array<['ff' | 'agents-manager', string, string]> = [
  // expected: Cyrillic names (D-2: NFC normalization at the contract boundary comes with ADR-0019)
  ['ff', 'docs/_inbox/2026-08-22-db-as-files-representation/01-что-это.md', 'cyrillic'],
  ['ff', 'docs/_inbox/2026-08-22-db-as-files-representation/02-модель-данных.md', 'cyrillic'],
  // correct: a Telegram chat id is a 13-digit run — never belongs in a ref
  ['ff', '.gateway/conversations/-1004351636302/147/config.json', 'chat-id digit run'],
  // FALSE POSITIVES (real ASCII docs): separators are stripped, so a digit before a date makes a ≥9 run
  ['ff', 'docs/02-project/core/01-brain/02-infrastructure/01-overview/SYNTHESIS-01-2026-07-09.md', 'digit before date'],
  ['ff', 'docs/02-project/core/00-kernel/concepts/graph-tree-git-projection/decisions/resolved-q0-q5-2026-07-26.decisions.md', 'digit before date'],
  ['ff', 'docs/base/product/VERDICT2-2026-06-15-advanced.md', 'digit before date'],
];

describe('source.ref on real repo paths (Stage 1, door D-2)', () => {
  it('the first document ref is exactly the one in the roadmap (ASCII, 61 chars) and passes', () => {
    const first = ref('ff', 'docs/architecture/ADR/ADR-0016-cross-project-brain.md');
    expect(first).toBe('repo:ff/docs/architecture/ADR/ADR-0016-cross-project-brain.md');
    expect(first.length).toBe(61);
    expect(check(first)).toBeNull();
  });

  it.each(PASS)('passes: repo:%s/%s', (key, path) => {
    const r = ref(key, path);
    expect(r.length).toBeLessThanOrEqual(LIMITS.sourceRefMaxChars);
    expect(check(r)).toBeNull();
  });

  it.each(REFUSED)('refused: repo:%s/%s (%s)', (key, path) => {
    expect(check(ref(key, path))?.code).toBe('SOURCE_REF_INVALID');
  });

  it('the FF paths of the fixture exist in this checkout (the list is real, not invented)', () => {
    const ffPaths = [...PASS, ...REFUSED].filter(([k]) => k === 'ff').map(([, p]) => p);
    const missing = ffPaths.filter((p) => !existsSync(FF_ROOT + p) && !existsSync(FF_ROOT + p.normalize('NFD')));
    expect(missing).toEqual([]);
  });

  it('the registry keys themselves are valid ref heads (a slug with a dash is fine)', () => {
    expect(check('repo:agents-manager/x.md')).toBeNull();
    expect(check('repo:ff/x.md')).toBeNull();
  });
});
