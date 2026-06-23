import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileNodeStore } from '../src/store';

let dir: string;
let store: FileNodeStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-core-'));
  store = new FileNodeStore(dir);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('FileNodeStore CRUD', () => {
  it('creates and reads a node round-trip', async () => {
    const n = await store.create({ kind: 'note', title: 'Hello', body: 'World', tags: ['finance'] });
    expect(n.id).toMatch(/^note_/);
    const read = await store.require(n.id);
    expect(read.title).toBe('Hello');
    expect(read.body).toBe('World');
    expect(read.tags).toEqual(['finance']);
    expect(read.importance).toBe('normal');
  });

  it('persists as markdown with frontmatter', async () => {
    const n = await store.create({ kind: 'task', title: 'Pay rent', status: 'open', due: '2026-07-01' });
    const raw = await fs.readFile(path.join(dir, 'nodes', `${n.id}.md`), 'utf8');
    expect(raw).toContain('kind: task');
    expect(raw).toContain('title: Pay rent');
    expect(raw.startsWith('---')).toBe(true);
  });

  it('updates and bumps the updated timestamp', async () => {
    const n = await store.create({ kind: 'task', title: 'X', status: 'open' });
    const updated = await store.update(n.id, { status: 'done' });
    expect(updated.status).toBe('done');
    expect(updated.created).toBe(n.created);
    expect(new Date(updated.updated).getTime()).toBeGreaterThanOrEqual(new Date(n.created).getTime());
  });

  it('returns null for a missing node and deletes safely', async () => {
    expect(await store.get('nope')).toBeNull();
    await store.delete('nope'); // no throw
  });
});

describe('query', () => {
  it('filters by kind, tag, status and roots', async () => {
    const g = await store.create({ kind: 'group', title: 'Финансы', tags: ['finance'] });
    await store.create({ kind: 'task', title: 'A', tags: ['finance'], status: 'open', parentId: g.id });
    await store.create({ kind: 'task', title: 'B', tags: ['finance'], status: 'done', parentId: g.id });
    await store.create({ kind: 'note', title: 'C', tags: ['health'] });

    expect((await store.query({ kind: 'task' })).length).toBe(2);
    expect((await store.query({ tag: 'finance' })).length).toBe(3);
    expect((await store.query({ status: 'open' })).length).toBe(1);
    expect((await store.query({ parentId: g.id })).length).toBe(2);
    const roots = await store.query({ parentId: null });
    expect(roots.map((n) => n.title).sort()).toEqual(['C', 'Финансы']);
  });
});

describe('hierarchy and links', () => {
  it('reports children and ancestors', async () => {
    const root = await store.create({ kind: 'group', title: 'Root' });
    const mid = await store.create({ kind: 'chat', title: 'Mid', parentId: root.id });
    const leaf = await store.create({ kind: 'task', title: 'Leaf', parentId: mid.id });

    expect((await store.children(root.id)).map((n) => n.id)).toEqual([mid.id]);
    const anc = await store.ancestors(leaf.id);
    expect(anc.map((n) => n.title)).toEqual(['Root', 'Mid']);
  });

  it('adds links idempotently', async () => {
    const a = await store.create({ kind: 'task', title: 'A' });
    const b = await store.create({ kind: 'note', title: 'B' });
    await store.link(a.id, b.id, 'relates');
    const again = await store.link(a.id, b.id, 'relates');
    expect(again.links).toEqual([{ to: b.id, rel: 'relates' }]);
  });
});
