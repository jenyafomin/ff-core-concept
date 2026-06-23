import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileNodeStore } from '../src/store';
import { contextLayers, effectiveContext } from '../src/context';

let dir: string;
let store: FileNodeStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-ctx-'));
  store = new FileNodeStore(dir);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('context cascade', () => {
  it('merges ancestor contexts root → node, skipping empty layers', async () => {
    const root = await store.create({ kind: 'group', title: 'Финансы', context: 'You manage money.' });
    const mid = await store.create({ kind: 'chat', title: 'Бюджет', parentId: root.id }); // no context
    const agent = await store.create({
      kind: 'agent',
      title: 'Бюджет-аналитик',
      parentId: mid.id,
      context: 'Be terse. Flag overspend.',
    });

    const layers = await contextLayers(store, agent.id);
    expect(layers.map((l) => l.title)).toEqual(['Финансы', 'Бюджет-аналитик']);

    const merged = await effectiveContext(store, agent.id);
    expect(merged).toContain('### Финансы');
    expect(merged).toContain('You manage money.');
    expect(merged).toContain('### Бюджет-аналитик');
    expect(merged).toContain('Flag overspend.');
    // Order: root context appears before the leaf's.
    expect(merged.indexOf('Финансы')).toBeLessThan(merged.indexOf('Бюджет-аналитик'));
  });

  it('returns empty string when no layer declares context', async () => {
    const n = await store.create({ kind: 'note', title: 'plain' });
    expect(await effectiveContext(store, n.id)).toBe('');
  });
});
