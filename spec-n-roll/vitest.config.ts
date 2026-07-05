import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'spec-n-roll-api': resolve('src/spec-n-roll-api/src/index.ts'),
    },
  },
  test: {
    include: ['src/*/test/**/*.test.ts'],
  },
});
