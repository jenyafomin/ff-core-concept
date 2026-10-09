import { z } from 'zod';
import { NODE_KINDS, IMPORTANCE, TASK_STATUS } from './node.js';

export const linkSchema = z.object({
  to: z.string().min(1),
  rel: z.string().min(1),
});

/**
 * Frontmatter schema = every node field EXCEPT `body` (which is the markdown
 * content of the file). Validated on read and write so a hand-edited file that
 * drifts from the contract fails loudly instead of corrupting the graph.
 */
export const frontmatterSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(NODE_KINDS),
  title: z.string(),
  tags: z.array(z.string()).default([]),
  parentId: z.string().optional(),
  links: z.array(linkSchema).default([]),
  status: z.enum(TASK_STATUS).optional(),
  due: z.string().optional(),
  importance: z.enum(IMPORTANCE).default('normal'),
  context: z.string().optional(),
  actor: z.string().optional(),
  created: z.string(),
  updated: z.string(),
  meta: z.record(z.unknown()).optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
