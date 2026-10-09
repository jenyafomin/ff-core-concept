// @ff/brain-mcp — per-turn call ordinal + idem key (SPEC-brain-v0.6 R-8, AC-24).
//
// The MCP process lives exactly one gateway turn, so a process-local counter IS the turn counter:
// the n-th `record` in a turn gets ordinal n. idem = sha256(conversationId + message_id + verb + ordinal)
// — args are deliberately NOT part of the key: a retried turn that rephrases the args must still dedup.

import { createHash } from 'node:crypto';
import type { BrainVerb } from './contract.js';

/** Counts calls per verb within this process (= within this turn). First call → 1. */
export class OrdinalCounter {
  private readonly counts = new Map<BrainVerb, number>();

  next(verb: BrainVerb): number {
    const n = (this.counts.get(verb) ?? 0) + 1;
    this.counts.set(verb, n);
    return n;
  }

  peek(verb: BrainVerb): number {
    return this.counts.get(verb) ?? 0;
  }
}

/**
 * idem key, hex sha256. Returns undefined when there is no conversationId or message_id (CLI / no
 * inbound message → no idem, AC-26). Parts are joined with NUL so `("a1","2")` ≠ `("a","12")`.
 */
export function computeIdem(
  conversationId: string | undefined,
  messageId: string | undefined,
  verb: BrainVerb,
  ordinal: number,
): string | undefined {
  if (!conversationId || !messageId) return undefined;
  return createHash('sha256')
    .update([conversationId, messageId, verb, String(ordinal)].join('\u0000'))
    .digest('hex');
}
