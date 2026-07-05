import { defineConfig } from 'vitest/config';

/**
 * Defines package-local Vitest discovery for the API package.
 */
const config = defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

export default config;
