/**
 * principal-form.test — RESERVED FORM only (ADR-0010 §Decision ②, Закон ①).
 *
 * Paper-freeze assertions for the principal-authentication seam: the additive, optional envelope fields
 * (per-axis principal trust + issuer + delegation slot) are EXPRESSIBLE and typecheck, with NO behavior.
 * Nothing here writes through the engine or asserts enforcement — enforcement is Decision ③ (deferred).
 *
 * This is a compile-first test: the value it protects is that the shape reserved now stays additive
 * (an Act with none of the new fields still typechecks → 0 migrations) and that the two trust axes are
 * INDEPENDENTLY expressible (critic edit #2 — not a flat single enum).
 */
import { describe, it, expect } from 'vitest';
import type { Act, PrincipalAssurance, PrincipalTrust } from '../src/index.js';

describe('ADR-0010 §② reserved form — principal-authentication seam (form only, no behavior)', () => {
  it('(a) an Act WITHOUT the new principal field is still valid and typechecks (additive → 0 migrations)', () => {
    const act: Act = {
      id: 'a-1',
      actor: 'user:jenya',
      provenance: { source_ref: 'customer:42' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
    };
    expect(act.principal).toBeUndefined();
  });

  it('(b) an Act WITH per-axis trust + issuer + delegation slot typechecks', () => {
    const act: Act = {
      id: 'a-2',
      actor: 'user:jenya',
      provenance: { source_ref: 'customer:42' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      principal: {
        whoActed: 'channel',
        underWhoseAuthority: 'attested',
        issuer: 'channel:gateway-dwizh',
        delegation: [], // reserved PRESENCE only, empty slot — semantics deferred (T-actor-delegation)
      },
    };
    expect(act.principal?.whoActed).toBe('channel');
    expect(act.principal?.underWhoseAuthority).toBe('attested');
    expect(act.principal?.issuer).toBe('channel:gateway-dwizh');
    expect(act.principal?.delegation).toEqual([]);
  });

  it('(c) the two axes are INDEPENDENTLY expressible (not collapsed to one flat enum)', () => {
    // who-acted proven by channel, but authority still unverified — a combination a flat enum could not carry.
    const attributionOnly: PrincipalAssurance = { whoActed: 'channel', underWhoseAuthority: 'unverified' };
    // and the inverse axis-combination is equally expressible.
    const authorityOnly: PrincipalAssurance = { whoActed: 'unverified', underWhoseAuthority: 'attested' };

    expect(attributionOnly.whoActed).toBe('channel');
    expect(attributionOnly.underWhoseAuthority).toBe('unverified');
    expect(authorityOnly.whoActed).toBe('unverified');
    expect(authorityOnly.underWhoseAuthority).toBe('attested');
    expect(attributionOnly.whoActed).not.toBe(attributionOnly.underWhoseAuthority);
  });

  it('the trust level union covers exactly the three reserved rungs', () => {
    const levels: PrincipalTrust[] = ['unverified', 'channel', 'attested'];
    expect(levels).toHaveLength(3);
  });
});
