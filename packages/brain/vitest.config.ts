import { defineConfig } from 'vitest/config';

// @ff/brain tests: unit (domain/read) + service integration. Service tests open real sockets and
// journals in tmp dirs (see test/support/brain-fixture.ts) — keep them in the default node env.
// The AC-47 bench is opt-in via BRAIN_BENCH=1 (test/bench.test.ts skips itself otherwise).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
