/**
 * The minimal `policy:constitution` ceiling the Engine refuses to start without (fail-stop). Identical
 * in shape to the one the engine/ingest tests seed. Kept here so the CLI and tests share ONE definition.
 */
import type { EnvelopeNode } from '@ff/engine';

export const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  // F2 (T-policy-node-provenance): the control-plane families are namespace-PROTECTED (write ceiling,
  // gated by core:manage-core). `policy:` seals the Constitution and any policy node against overwrite;
  // `meta:cap/core:` seals the core capability nodes. Grants (`grant:`) are gated on the write path by
  // canMintGrant (core:manage-grants), so they need no ceiling entry here. Empty ⇒ ceiling is a no-op.
  body: { synthetic: true, no_read: [], protected_namespaces: ['policy:', 'meta:cap/core:'], default: 'deny' },
};
