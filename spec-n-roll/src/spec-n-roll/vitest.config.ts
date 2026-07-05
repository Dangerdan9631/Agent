import { defineConfig } from 'vitest/config';

/**
 * Defines package-local Vitest discovery so workspace tests run from this
 * package without relying on root-relative include patterns.
 */
const config = defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

export default config;
