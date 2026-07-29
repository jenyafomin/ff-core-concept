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
  body: { synthetic: true, no_read: [], protected_namespaces: [], default: 'deny' },
};
