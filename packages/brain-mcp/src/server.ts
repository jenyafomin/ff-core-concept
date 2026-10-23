// @ff/brain-mcp — the MCP surface: 4 tools record · find · read · link (SPEC-brain-v0.6 R-6, AC-06).
//
// Input schemas mirror the contract request types and contain NO identity fields (conversationId,
// author, principal, sender…). Unknown keys are stripped by zod before the call, so identity can never
// ride in the body even if the agent tries; it comes only from env → headers (client.ts).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat as SdkShape } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  FIND_PRESETS,
  LIMITS,
  SOURCE_KINDS,
  type BrainResult,
  type FindRequest,
  type LinkRequest,
  type ReadRequest,
  type RecordRequest,
} from './contract.js';
import type { BrainClient } from './client.js';

export const BRAIN_MCP_NAME = 'ff-brain' as const;
export const BRAIN_MCP_VERSION = '0.6.0' as const;

const fieldValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]);
const sourceKind = z.enum(SOURCE_KINDS as unknown as ['file', 'act', 'url']);
const findPreset = z.enum(FIND_PRESETS as unknown as ['morning', 'evening', 'open', 'scope', 'overview']);

export const recordInput = {
  type: z.string().min(1).describe('task · decision · note · person · day · raw (сомневаешься — raw)'),
  label: z.string().min(1).max(LIMITS.labelMaxChars).describe('≤120 знаков, глагол+предмет'),
  fields: z.record(z.string(), fieldValue).optional(),
  scopes: z.array(z.string()).max(LIMITS.recordScopesMax).optional().describe('Не указывай — область топика'),
  edges: z.array(z.object({ pred: z.string(), to: z.string() })).max(LIMITS.recordEdgesMax).optional(),
  visibility: z.enum(['scoped', 'owner']).optional(),
  initiative: z.enum(['owner', 'agent']).optional().describe('agent → запись станет proposed'),
  id: z.string().optional().describe('С id — правка существующей записи'),
  expected_rev: z.number().int().optional(),
  retract: z.boolean().optional(),
  reason: z.string().optional(),
  derived_from: z.array(z.string()).optional(),
  source: z.object({ kind: sourceKind, ref: z.string(), hash: z.string().optional() }).optional(),
  layer: z.number().int().optional(),
};

export const findInput = {
  scope: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  text: z.string().optional(),
  due_before: z.string().optional(),
  edge: z.object({ pred: z.string(), to: z.string().optional() }).optional(),
  preset: findPreset.optional(),
  include_cold: z.boolean().optional(),
  limit: z.number().int().min(1).max(LIMITS.findLimitMax).optional(),
  cursor: z.string().optional(),
};

export const readInput = {
  id: z.string().min(1),
  depth: z.number().int().min(0).max(LIMITS.readDepthMax).optional(),
  max_nodes: z.number().int().min(1).max(LIMITS.readMaxNodesMax).optional(),
  preds: z.array(z.string()).optional(),
};

export const linkInput = {
  from: z.string().min(1),
  pred: z.string().min(1),
  to: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['active', 'retracted']).optional(),
  note: z.string().optional(),
};

function toToolResult(r: BrainResult<{ ok: true }>): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(r) }], isError: r.ok !== true };
}

/** Drops undefined keys so the wire body only carries what the agent actually passed. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/**
 * The SDK's types are compiled against the hoisted zod (3.25, with its own `zod/v4` core), while this
 * package uses zod 4.x; at runtime the SDK only sniffs `_zod` and delegates parse/JSON-schema to the
 * schema itself, so the shapes work — only the static types disagree. Hence the cast at this one seam;
 * handler args are re-typed from the contract request types instead.
 */
const asSdkShape = (shape: z.ZodRawShape): SdkShape => shape as unknown as SdkShape;

export function createBrainMcpServer(client: BrainClient): McpServer {
  const server = new McpServer({ name: BRAIN_MCP_NAME, version: BRAIN_MCP_VERSION });

  server.registerTool(
    'record',
    {
      description:
        'Записать/исправить единицу памяти. Передай receipt владельцу дословно. Нет ok:true — НЕ говори «записал»; queued:true — «запись в очереди».',
      inputSchema: asSdkShape(recordInput),
    },
    async (args: unknown) => toToolResult(await client.record(clean(args as RecordRequest))),
  );

  server.registerTool(
    'find',
    {
      description:
        'Найти записи (без тел). preset: morning|evening|open|scope — сжатый дайджест; overview — карта памяти (области ✍️/👁, счётчики по типам и статусам, без записей), первый вызов.',
      inputSchema: asSdkShape(findInput),
    },
    async (args: unknown) => toToolResult(await client.find(clean(args as FindRequest))),
  );

  server.registerTool(
    'read',
    {
      description: 'Прочитать запись по id с рёбрами и соседями (depth 0..2).',
      inputSchema: asSdkShape(readInput),
    },
    async (args: unknown) => toToolResult(await client.read(clean(args as ReadRequest))),
  );

  server.registerTool(
    'link',
    {
      description: 'Связать две записи известным предикатом; status:"retracted" — снять связь.',
      inputSchema: asSdkShape(linkInput),
    },
    async (args: unknown) => toToolResult(await client.link(clean(args as LinkRequest))),
  );

  return server;
}
