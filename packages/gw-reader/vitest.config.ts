import { defineConfig } from 'vitest/config';

// @ff/gw-reader tests run ONLY against tmp fixture SQLite files — never the live gateway DB.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
