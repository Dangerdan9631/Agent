import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/cli/test/functional/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});