import type { FFNode } from './node';

/**
 * Levels are computed "zoom" over a single node, never stored separately
 * (this was the owner's chosen meaning of "×10 levels": zoom + nesting,
 * NOT authored versions). See COUNCIL-2026-06-13-first-slice.md.
 *
 *   L1 = title (the essence)
 *   L2 = title + a snippet of the body (~50 words by default)
 *   L3 = title + full body
 */
export type Level = 1 | 2 | 3;

export function snippet(text: string, words = 50): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= words) return tokens.join(' ');
  return tokens.slice(0, words).join(' ') + '…';
}

export function renderLevel(node: FFNode, level: Level, words = 50): string {
  if (level === 1) return node.title;
  if (level === 2) {
    const s = snippet(node.body, words);
    return s ? `${node.title}\n${s}` : node.title;
  }
  return node.body ? `${node.title}\n${node.body}` : node.title;
}
