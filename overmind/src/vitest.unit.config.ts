import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/core/test/**/*.test.ts',
      'packages/service/test/**/*.test.ts',
      'packages/cli/test/**/*.test.ts',
      'packages/mcp/test/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
