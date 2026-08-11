/**
 * erasure-plane-falsify.test — D1.b Stage 2: make the erasure/edge/same-as plane GENUINELY falsifiable.
 *
 * The census caught that `erasure-seam.test.ts` proves a TAUTOLOGY: `edges` lives in `...meta` by language
 * construction, so "edges survive splitAct" is true for ANY implementation — including a broken one — and
 * it never touches the disk. These tests remove that tautology on three axes, all through a REAL OS-process
 * boundary (P1 writes+shreds, exits; P2 boots fresh on the same store-dir — nothing shared but disk):
 *
 *   §9-3   a REAL ga-rentacar order act is written, its INLINE erasable payload zone PHYSICALLY shredded
 *          on disk (`store.shredPayload`), and after reboot its edges must deep-equal an INDEPENDENT
 *          before-snapshot (structuredClone of the original act, NOT via splitAct/project) while its inline
 *          payload is gone. NB: by-ref payload (payloadRef/payloadHash blob) is NOT erased by shredPayload —
 *          real PII lives there; hard-erase is the open load-bearing fork T-D1b-shred-by-ref-pii.
 *   §9-3 MUTANT  a serialization that DROPS edges (`{ payload, edges: undefined, ...rest }`) MUST break that
 *          assert — proving the assert has teeth (a green test under the mutant would be worthless).
 *   §9-3b  a ≥3-member same-as group (real `confirmSameAs`) survives a shred of a DIFFERENT member's payload.
 *   F6     a structurally DIFFERENT act (new act-kind, nested/arrayed payload, non-rentacar predicate)
 *          round-trips through the SAME disk shred+reboot with edges intact and payload erased.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HARNESS = fileURLToPath(new URL('./harness/erasure-plane-harness.ts', import.meta.url));
const RB_DIR = fileURLToPath(new URL('..', import.meta.url)); // packages/rental-balance — cwd for tsx resolution

function runProcess(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', HARNESS, ...args], { cwd: RB_DIR, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('§9-3 — a REAL ga-rentacar payload shred on disk leaves edges intact (cross-process, non-tautological)', () => {
  it('order edges survive shred+reboot and deep-equal an INDEPENDENT before-snapshot; payload is gone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-order-'));
    try {
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'order']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);
      expect(w.edgesBefore.length).toBeGreaterThan(0); // the order really carried edges (rented + drives)

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'order']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.found).toBe(true);
      expect(r.edgesAfter).toEqual(w.edgesBefore);  // edges ⟂ payload: shred did NOT touch the edges
      expect(r.bodyKeysAfter).toEqual([]);          // the INLINE erasable payload zone is gone on disk (by-ref blob survives — fork T-D1b-shred-by-ref-pii)
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('MUTANT (edges dropped in serialization) BREAKS the §9-3 assert — the assert has teeth', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-mutant-'));
    try {
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'order', '--mutant']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'order']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      // The honest §9-3 property (edgesAfter deep-equals edgesBefore) MUST be VIOLATED under the mutant:
      // a serialization that drops edges leaves the projected node with none. If this ever passed, §9-3
      // would be a tautology again.
      expect(r.edgesAfter).not.toEqual(w.edgesBefore);
      expect(r.edgesAfter).toEqual([]); // concretely: the mutant lost every edge on the round-trip
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('§9-3b — a same-as group survives a shred of ANOTHER member’s payload (cross-process)', () => {
  it('≥3-member same-as membership deep-equals an independent before-snapshot after shred+reboot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-sameas-'));
    try {
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'sameas']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);
      expect(w.sameAsTargetsBefore.length).toBeGreaterThanOrEqual(2); // subject + 2 targets ⇒ ≥3 members

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'sameas']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.found).toBe(true);
      expect(r.sameAsTargetsAfter).toEqual(w.sameAsTargetsBefore); // identity edges ⟂ the shredded payload
      expect(r.bodyKeysAfter).toEqual([]);                          // the subject's own payload IS shredded
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('LOCK holds through disk: under a HOSTILE registry (same-as:one) all ≥3 targets still survive reboot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-lock-'));
    try {
      // Both P1 and P2 fold under a registry that DECLARES same-as:'one' — only LOCKED_MANY_PREDICATES
      // forcing 'many' keeps the group whole. (RENTACAR_PREDICATES omits same-as, so the prior test would
      // pass on the `?? 'many'` default even with the lock deleted — this branch removes that tautology.)
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'sameas', '--hostile']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'sameas', '--hostile']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.sameAsTargetsAfter).toEqual(w.sameAsTargetsBefore); // lock wins over the hostile registry
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('MUTANT (kernel lock removed) COLLAPSES the group under same-as:one — the lock-assert has teeth', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-lock-mutant-'));
    try {
      // Strip LOCKED_MANY_PREDICATES at runtime (--unlock) so the hostile same-as:'one' is honored → the
      // 'one' branch REPLACE-folds → only the last same-as target survives. The honest lock property MUST fail.
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'sameas', '--hostile', '--unlock']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'sameas', '--hostile', '--unlock']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.sameAsTargetsAfter).not.toEqual(w.sameAsTargetsBefore); // without the lock, the group is NOT whole
      expect(r.sameAsTargetsAfter.length).toBeLessThan(w.sameAsTargetsBefore.length); // collapsed to the last target
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('F6 — a structurally different act (new act-kind, nested payload, non-rentacar predicate) survives the SAME plane', () => {
  it('an access_event with a nested/arrayed payload round-trips shred+reboot: edges intact, payload erased', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-erasure-f6-'));
    try {
      const p1 = runProcess(['--store-dir', dir, '--write', '--scenario', 'access']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);
      expect(w.edgesBefore.length).toBe(2); // granted-to + same-as (neither is a ga-rentacar predicate)

      const p2 = runProcess(['--store-dir', dir, '--read', '--scenario', 'access']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.found).toBe(true);
      expect(r.edgesAfter).toEqual(w.edgesBefore);  // form-agnostic: the split held for a non-rentacar shape
      expect(r.payloadPresent).toBe(false);         // the nested/arrayed payload zone was physically shredded
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
