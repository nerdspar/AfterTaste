import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Tests import app modules by the same '@/' alias the app uses.
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    // Node environment: these guard source-level invariants and pure logic.
    // Component tests would add jsdom + Testing Library when something needs it.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The check scripts shell out to tsc, which is not fast.
    testTimeout: 120_000,
  },
});
