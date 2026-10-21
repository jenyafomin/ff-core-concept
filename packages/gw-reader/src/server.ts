// @ff/gw-reader — MCP surface (ADR-0018): gw_recent · gw_resolve · gw_topics · gw_label · gw_labels.
// Every text that leaves goes through reader.ts (owner/in/forward filters + redaction). stderr gets
// counters only — never message bodies, notes or queries.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
// zod v4 API (same as the sibling MCP package). The 'zod/v4' subpath exists in zod >=3.25 and in 4.x, so this
// runs on the root-hoisted 3.25 today and on ^4 after a lockfile refresh — no lockfile change needed now.
import { z } from 'zod/v4';
import { appendLabel, currentLabels, LABEL_VALUES, NOTE_MAX } from './labels.js';
import { EXCERPT_MAX, LIMITS, recent, resolve, topics, type ReaderConfig } from './reader.js';
import { redactText } from './redact.js';

export const GW_READER_NAME = 'gw-reader' as const;
export const GW_READER_VERSION = '0.1.0' as const;

export interface ServerDeps {
  reader: ReaderConfig;
  labelsPath: string;
  /** Counter sink; defaults to stderr. Receives ONLY tool name + numbers. */
  count?: (tool: string, counters: Record<string, number>) => void;
}

export const recentInput = {
  days: z.number().int().min(1).max(LIMITS.daysMax).optional().describe(`Окно в днях, ≤${LIMITS.daysMax} (деф. ${LIMITS.daysDefault})`),
  topic: z.string().optional().describe('gw:<alias>/t<N> из gw_topics, или t<N> (тред в любом чате)'),
  limit: z.number().int().min(1).max(LIMITS.limitMax).optional(),
  query: z.string().max(200).optional().describe('Подстрока (ищется по уже отфильтрованному тексту)'),
};
export const resolveInput = { address: z.string().min(1).describe('gw:<alias>/t<N>/m<id>') };
export const topicsInput = { days: z.number().int().min(1).max(LIMITS.daysMax).optional() };
export const labelInput = {
  address: z.string().min(1),
  label: z.enum(LABEL_VALUES),
  note: z.string().max(NOTE_MAX).optional(),
};

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}
function fail(error: string): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error }) }], isError: true };
}
function safeError(e: unknown): string {
  // Driver errors may echo SQL but never row content; still keep it short.
  const m = e instanceof Error ? e.message : String(e);
  return m.slice(0, 200);
}

export function createGwReaderServer(deps: ServerDeps): McpServer {
  const count =
    deps.count ??
    ((tool: string, c: Record<string, number>) =>
      process.stderr.write(
        `gw-reader: ${tool} ${Object.entries(c)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}\n`,
      ));
  const server = new McpServer({ name: GW_READER_NAME, version: GW_READER_VERSION });

  server.registerTool(
    'gw_recent',
    {
      description: `Последние сообщения владельца из лога шлюза (только входящие, без пересланных; секреты скрыты построчно). Текст — выдержка ≤${EXCERPT_MAX} симв.; полное — нет.`,
      inputSchema: recentInput,
    },
    async (args) => {
      try {
        const items = recent(deps.reader, args);
        count('gw_recent', { n: items.length, redacted: items.filter((i) => i.redacted).length });
        return ok({ ok: true, items });
      } catch (e) {
        count('gw_recent', { error: 1 });
        return fail(safeError(e));
      }
    },
  );

  server.registerTool(
    'gw_resolve',
    { description: 'Одно сообщение по адресу gw:<alias>/t<N>/m<id> (тот же фильтр).', inputSchema: resolveInput },
    async ({ address }) => {
      try {
        const r = resolve(deps.reader, address);
        count('gw_resolve', { found: r.ok ? 1 : 0, redacted: r.ok && r.message.redacted ? 1 : 0 });
        return r.ok ? ok(r) : fail(r.error);
      } catch (e) {
        count('gw_resolve', { error: 1 });
        return fail(safeError(e));
      }
    },
  );

  server.registerTool(
    'gw_topics',
    { description: 'Топики с числом сообщений владельца за окно (без текста).', inputSchema: topicsInput },
    async (args) => {
      try {
        const items = topics(deps.reader, args);
        count('gw_topics', { topics: items.length, messages: items.reduce((s, t) => s + t.count, 0) });
        return ok({ ok: true, items });
      } catch (e) {
        count('gw_topics', { error: 1 });
        return fail(safeError(e));
      }
    },
  );

  server.registerTool(
    'gw_label',
    {
      description: 'Пометить сообщение: open | closed | mute. Пишет только в журнал меток читателя, не в БД шлюза.',
      inputSchema: labelInput,
    },
    async ({ address, label, note }) => {
      try {
        const r = resolve(deps.reader, address);
        if (!r.ok) {
          count('gw_label', { written: 0 });
          return fail(r.error);
        }
        const entry = appendLabel(deps.labelsPath, {
          // canonical address from the resolved message — one message, one label key
          address: r.message.address,
          label,
          ...(note !== undefined ? { note: redactText(note).text } : {}),
        });
        count('gw_label', { written: 1 });
        return ok({ ok: true, entry });
      } catch (e) {
        count('gw_label', { error: 1 });
        return fail(safeError(e));
      }
    },
  );

  server.registerTool(
    'gw_labels',
    { description: 'Текущие метки (последняя по адресу побеждает).', inputSchema: {} },
    async () => {
      try {
        const items = currentLabels(deps.labelsPath).map((e) => (e.note ? { ...e, note: redactText(e.note).text } : e));
        count('gw_labels', { n: items.length });
        return ok({ ok: true, items });
      } catch (e) {
        count('gw_labels', { error: 1 });
        return fail(safeError(e));
      }
    },
  );

  return server;
}
