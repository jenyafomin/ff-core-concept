#!/usr/bin/env node
// @ff/gw-reader — stdio entry (ADR-0018). Importing this module starts NOTHING; only running it as
// the process entry point connects the stdio transport.

import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { labelsPathFromEnv } from './labels.js';
import { configFromEnv } from './reader.js';
import { createGwReaderServer } from './server.js';

export { GW_READER_NAME, GW_READER_VERSION, createGwReaderServer } from './server.js';
export { recent, resolve, topics, configFromEnv, openReadOnly, isForwarded, FORWARD_MARKER, EXCERPT_MAX } from './reader.js';
export { redactText, REDACTED_LINE } from './redact.js';
export { chatAlias, formatAddress, parseAddress, parseSessionKey } from './address.js';
export { appendLabel, currentLabels, labelsPathFromEnv } from './labels.js';

export async function main(): Promise<void> {
  const server = createGwReaderServer({ reader: configFromEnv(), labelsPath: labelsPathFromEnv() });
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
    process.stderr.write(`gw-reader: ${e instanceof Error ? e.message.slice(0, 200) : 'start failed'}\n`);
    process.exit(1);
  });
}
