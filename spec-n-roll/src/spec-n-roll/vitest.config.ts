import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Defines package-local Vitest discovery so workspace tests run from this
 * package without relying on root-relative include patterns.
 */
const config = defineConfig({
  resolve: {
    alias: {
      'spec-n-roll-api': resolve('../spec-n-roll-api/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});

export default config;
