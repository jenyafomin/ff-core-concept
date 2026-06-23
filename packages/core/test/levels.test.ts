import { describe, it, expect } from 'vitest';
import { renderLevel, snippet } from '../src/levels';
import type { FFNode } from '../src/node';

const node: FFNode = {
  id: 'note_x',
  kind: 'note',
  title: 'Идея системы',
  body: Array.from({ length: 120 }, (_, i) => `word${i}`).join(' '),
  tags: [],
  links: [],
  importance: 'normal',
  created: '2026-06-13T00:00:00.000Z',
  updated: '2026-06-13T00:00:00.000Z',
};

describe('levels (computed zoom)', () => {
  it('L1 is the title only', () => {
    expect(renderLevel(node, 1)).toBe('Идея системы');
  });

  it('L2 is title + a bounded snippet', () => {
    const l2 = renderLevel(node, 2, 50);
    expect(l2.startsWith('Идея системы')).toBe(true);
    expect(l2).toContain('word0');
    expect(l2).toContain('…');
    expect(l2).not.toContain('word119');
  });

  it('L3 is title + full body', () => {
    const l3 = renderLevel(node, 3);
    expect(l3).toContain('word119');
  });

  it('snippet does not truncate short text', () => {
    expect(snippet('a b c', 50)).toBe('a b c');
  });
});
