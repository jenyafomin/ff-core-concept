// pm2 config (prelaunch critic F3): the interpreter must be an absolute Node >=20, never a bare 'node'
// (the live pm2 daemon runs on Node 18 and would resolve 'node' through its own PATH).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const configPath = join(here, '../../ecosystem.brain.config.cjs');
const require = createRequire(import.meta.url);
const DEFAULT_NODE = '/Users/mac16/.nvm/versions/node/v22.23.2/bin/node';

interface App {
  name: string;
  script: string;
  interpreter: string;
}

function loadApp(): App {
  delete require.cache[require.resolve(configPath)];
  return (require(configPath) as { apps: App[] }).apps[0]!;
}

const saved = process.env.FF_BRAIN_NODE;
afterEach(() => {
  if (saved === undefined) delete process.env.FF_BRAIN_NODE;
  else process.env.FF_BRAIN_NODE = saved;
});

describe('ecosystem.brain.config.cjs', () => {
  it('defaults the interpreter to the pinned absolute Node 22 path', () => {
    delete process.env.FF_BRAIN_NODE;
    const app = loadApp();
    expect(app.name).toBe('ff-brain');
    expect(app.interpreter).toBe(DEFAULT_NODE);
    expect(isAbsolute(app.interpreter)).toBe(true);
    expect(app.script.endsWith('dist/bin/ff-brain-serve.js')).toBe(true);
  });

  it('FF_BRAIN_NODE overrides the interpreter', () => {
    process.env.FF_BRAIN_NODE = '/opt/node-24/bin/node';
    expect(loadApp().interpreter).toBe('/opt/node-24/bin/node');
  });

  it.skipIf(!existsSync(DEFAULT_NODE))('the pinned interpreter is Node >=20 on this machine', () => {
    const v = execFileSync(DEFAULT_NODE, ['-p', 'process.versions.node'], { encoding: 'utf8' }).trim();
    expect(Number(v.split('.')[0])).toBeGreaterThanOrEqual(20);
  });
});
