// R-8 / AC-24 (client side): ordinal grows per verb within the process; idem ignores args.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeIdem, OrdinalCounter } from '../src/ordinal.js';
import { BrainClient } from '../src/client.js';

describe('ordinal', () => {
  it('grows per verb, independently', () => {
    const o = new OrdinalCounter();
    expect(o.next('record')).toBe(1);
    expect(o.next('record')).toBe(2);
    expect(o.next('find')).toBe(1);
    expect(o.next('record')).toBe(3);
    expect(o.peek('link')).toBe(0);
  });
});

describe('idem', () => {
  it('= sha256 over conversationId · message_id · verb · ordinal', () => {
    const expected = createHash('sha256').update(['c:1', 'm9', 'record', '2'].join('\u0000')).digest('hex');
    expect(computeIdem('c:1', 'm9', 'record', 2)).toBe(expected);
  });

  it('differs by ordinal and verb; undefined without message_id or conversationId', () => {
    expect(computeIdem('c', 'm', 'record', 1)).not.toBe(computeIdem('c', 'm', 'record', 2));
    expect(computeIdem('c', 'm', 'record', 1)).not.toBe(computeIdem('c', 'm', 'link', 1));
    expect(computeIdem('c', undefined, 'record', 1)).toBeUndefined();
    expect(computeIdem(undefined, 'm', 'record', 1)).toBeUndefined();
  });

  it('a retried turn (new process, different args) yields the same idem sequence', () => {
    const env = { FF_BRAIN_HOME: '/nonexistent', FF_BRAIN_CONVERSATION_ID: 'c:1', FF_BRAIN_MESSAGE_ID: '5' };
    const a = new BrainClient({ env });
    const b = new BrainClient({ env });
    // args are not an input of nextCaller at all — the key is identity + verb + ordinal only
    expect(a.nextCaller('record').idem).toBe(b.nextCaller('record').idem);
    expect(a.nextCaller('record').idem).toBe(b.nextCaller('record').idem);
    expect(a.nextCaller('record').idem).not.toBe(a.nextCaller('record').idem);
  });
});
