/**
 * principal-seam.test — PAPER-FREEZE only (ADR-0010 §③-bis; design 01-seam-and-lifecycle).
 *
 * Compile-first assertions for the write-principal SEAM shape (`PrincipalResolver` + `PrincipalStamper`).
 * NO behavior: nothing is implemented or wired into `engine.ts`/`write()`. The value protected here is
 * that the seam TYPES are expressible and encode the guardrails structurally:
 *   • `PrincipalResolver` extends `ViewerResolver` (one seam, read + write) and yields an
 *     `AuthenticatedPrincipal { subject, trust, issuer }`.
 *   • `PrincipalStamper.stamp(incoming, principal)` returns an `Ack`-style union — a stamped Act OR a
 *     REFUSAL (G1: mismatch is refused, never a silent `actor` rewrite).
 * These are typed stubs (`as` casts), never invoked — a paper-freeze, like viewer-resolver.ts.
 */
import { describe, it, expect } from 'vitest';
import type {
  AuthenticatedPrincipal,
  PrincipalResolver,
  PrincipalStamper,
  PrincipalStampResult,
  SubjectRef,
} from '../src/index.js';

describe('ADR-0010 §③-bis write-principal seam — shape only, no behavior', () => {
  it('(a) AuthenticatedPrincipal { subject, trust, issuer, seamAuthority } is expressible', () => {
    const p: AuthenticatedPrincipal = {
      subject: 'user:jenya',
      trust: 'channel',
      issuer: 'gateway:agents-manager',
      seamAuthority: 'host-registry:ff-engine', // G4 (ADR-0011): required — who vouches for the stamper
    };
    expect(p.trust).toBe('channel');
    expect(p.seamAuthority).toBe('host-registry:ff-engine');
  });

  it('(b) PrincipalResolver is a ViewerResolver + resolveWritePrincipal (one read+write seam)', () => {
    const resolver = {} as PrincipalResolver;
    // Both members are on the type surface (never called — paper-freeze):
    type ReadFn = typeof resolver.resolveViewer;
    type WriteFn = typeof resolver.resolveWritePrincipal;
    const _read = null as unknown as ReadFn;
    const _write = null as unknown as WriteFn;
    expect(resolver).toBeDefined();
    void _read;
    void _write;
  });

  it('(c) PrincipalStamper.stamp yields an Ack-style union (stamped Act OR refusal — G1)', () => {
    const stamper = {} as PrincipalStamper;
    const ok: PrincipalStampResult = { ok: true, act: {
      id: 'a-1', actor: 'user:jenya', provenance: '', recordedAt: '',
      actKind: 'domain_event', edges: [],
    } };
    const refused: PrincipalStampResult = { ok: false, reason: 'actor mismatch — REFUSED (G1)' };
    const _subject: SubjectRef = 'user:jenya';
    expect(ok.ok && refused.ok === false).toBe(true);
    void stamper;
    void _subject;
  });
});
