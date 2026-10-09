// R-1: brain-mcp carries a byte-copy of @ff/brain/src/contract.ts (no package dependency).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('contract copy', () => {
  it('src/contract.ts is identical to packages/brain/src/contract.ts', () => {
    const mine = readFileSync(fileURLToPath(new URL('../src/contract.ts', import.meta.url)), 'utf8');
    const source = readFileSync(fileURLToPath(new URL('../../brain/src/contract.ts', import.meta.url)), 'utf8');
    expect(mine).toBe(source);
  });

  it('package.json does not depend on @ff/brain or @ff/engine', () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    expect(Object.keys(deps)).not.toContain('@ff/brain');
    expect(Object.keys(deps)).not.toContain('@ff/engine');
  });
});
