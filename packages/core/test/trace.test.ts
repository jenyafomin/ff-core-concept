import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileNodeStore } from '../src/store';
import { recordTrace } from '../src/trace';

let dir: string;
let store: FileNodeStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-trace-'));
  store = new FileNodeStore(dir);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('trace (graph = memory)', () => {
  it('records an action linking read and wrote nodes', async () => {
    const chat = await store.create({ kind: 'chat', title: 'Разбор инбокса' });
    const input = await store.create({ kind: 'thought', title: 'купить молоко и позвонить маме' });
    const out = await store.create({ kind: 'task', title: 'Позвонить маме', status: 'open', parentId: chat.id });

    const trace = await recordTrace(store, {
      actor: 'agt_triage',
      action: 'Разобрал мысль в задачу',
      read: [input.id],
      wrote: [out.id],
      inChat: chat.id,
      importance: 'high',
    });

    expect(trace.kind).toBe('trace');
    expect(trace.actor).toBe('agt_triage');
    expect(trace.importance).toBe('high');
    expect(trace.links).toContainEqual({ to: input.id, rel: 'read' });
    expect(trace.links).toContainEqual({ to: out.id, rel: 'wrote' });
    expect(trace.links).toContainEqual({ to: chat.id, rel: 'in' });
    // It lives in the same graph and is queryable.
    expect((await store.query({ kind: 'trace' })).length).toBe(1);
  });
});
