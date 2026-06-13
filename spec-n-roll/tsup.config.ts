import { defineConfig } from 'tsup';

/**
 * Builds the executable entrypoints while preserving the dist paths referenced
 * by package bin declarations, launchers, and integration tests.
 */
const config = defineConfig({
  entry: {
    'cli/dispatcher': 'src/cli/dispatcher.ts',
    'cli/index': 'src/cli/index.ts',
    'mcp/server': 'src/mcp/server.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node24',
  splitting: false,
  sourcemap: true,
});

export default config;
