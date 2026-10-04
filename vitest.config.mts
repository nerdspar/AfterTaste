import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment: these guard source-level invariants and pure logic.
    // Component tests would add jsdom + Testing Library when something needs it.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The check scripts shell out to tsc, which is not fast.
    testTimeout: 120_000,
  },
});
