#!/usr/bin/env node
// @ff/brain-mcp — stdio entry (ADR-0016 D1/D8/D12, SPEC-brain-v0.6 R-6/R-8).
// The gateway (G1) spawns this per turn with FF_BRAIN_* env; identity → headers, never tool args.
// No dependency on @ff/engine / @ff/brain: the wire contract is a byte-copy (src/contract.ts, synced by test).

import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BrainClient } from './client.js';
import { createBrainMcpServer } from './server.js';

export { BRAIN_MCP_NAME, BRAIN_MCP_VERSION, createBrainMcpServer } from './server.js';
export { BRAIN_CHARTER, CHARTER_MAX_CHARS } from './charter.js';
export { BrainClient, callerFromEnv, callerHeaders, resolvePaths } from './client.js';
export { Outbox } from './outbox.js';
export { OrdinalCounter, computeIdem } from './ordinal.js';

export async function main(): Promise<void> {
  const client = new BrainClient();
  const server = createBrainMcpServer(client);
  await server.connect(new StdioServerTransport());
}

function isEntry(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(argv1)).href;
  } catch {
    return false;
  }
}

if (isEntry()) {
  main().catch((e: unknown) => {
    process.stderr.write(`ff-brain-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
