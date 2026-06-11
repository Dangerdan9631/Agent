import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/contract/**/*.test.ts',
    ],
    passWithNoTests: true,
    environment: 'node',
    globals: false,
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@fixtures': path.resolve(rootDir, 'tests/fixtures'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@fixtures': path.resolve(rootDir, 'tests/fixtures'),
    },
  },
});
