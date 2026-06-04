import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@overmind-sdk\/(.*)$/,
        replacement: path.resolve(rootDir, 'packages/overmind-sdk/src/$1'),
      },
      {
        find: /^overmind-sdk\/(.*)$/,
        replacement: path.resolve(rootDir, 'packages/overmind-sdk/src/$1'),
      },
      {
        find: 'overmind-sdk',
        replacement: path.resolve(rootDir, 'packages/overmind-sdk/src/index.ts'),
      },
      {
        find: /^@overmind\/(.*)$/,
        replacement: path.resolve(rootDir, 'packages/overmind/src/$1'),
      },
      {
        find: /^@overmind-cli\/(.*)$/,
        replacement: path.resolve(rootDir, 'packages/overmind-cli/src/$1'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: [
      'test/integration/**/*.test.ts',
      'packages/**/test/integration/**/*.test.ts',
    ],
    testTimeout: 30_000,
  },
});
