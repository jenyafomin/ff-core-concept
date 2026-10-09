// @ff/brain/domain/constitution — the `policy:constitution` ceiling the Engine refuses to start without
// (engine.ts fail-stop). Copy of packages/rental-balance/src/core/constitution.ts (SPEC R-3): the brain
// depends only on @ff/engine, so it carries its own copy instead of importing rental-balance.
import type { EnvelopeNode } from '@ff/engine';

export const BRAIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  // Control-plane families are namespace-PROTECTED (write ceiling, gated by core:manage-core). Brain ids
  // (`u_…`, `typedef:…`, `pred:…`, `scope:…`) never fall under these prefixes.
  body: { synthetic: true, no_read: [], protected_namespaces: ['policy:', 'meta:cap/core:'], default: 'deny' },
};

/** The non-persisted substrate handed to the store on every boot (`DurableFsStore(dir, base, …)`). */
export function brainBase(): EnvelopeNode[] {
  return [structuredClone(BRAIN_CONSTITUTION)];
}
