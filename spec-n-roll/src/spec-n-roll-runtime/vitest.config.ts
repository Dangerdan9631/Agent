import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Defines package-local Vitest discovery for the runtime package.
 */
const config = defineConfig({
  resolve: {
    alias: {
      'spec-n-roll-api': resolve('../spec-n-roll-api/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});

export default config;
