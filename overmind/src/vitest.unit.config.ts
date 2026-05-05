import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
      include: [
        'packages/service/**/*.ts',
      ],
      thresholds: {
        branches: 100,
      },
    },
  },
});
