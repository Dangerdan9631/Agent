import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/core/test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
      include: [
        'packages/core/src/config.ts',
        'packages/core/src/writer.ts',
        'packages/core/src/generators/base.ts',
      ],
      thresholds: {
        branches: 100,
      },
    },
  },
});