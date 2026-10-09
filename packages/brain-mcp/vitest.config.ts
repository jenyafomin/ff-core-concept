import { defineConfig } from 'vitest/config';

// @ff/brain-mcp tests: tool schemas (no identity fields), env → headers, ordinal, idem, outbox.
// Tests talk to a fake HTTP server on a tmp unix socket — never to the real ~/.ff-brain.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
