import { defineConfig } from 'tsup';

/**
 * Stubs Ink's optional react-devtools-core import so standalone bundles build without the peer.
 */
const stubReactDevtoolsCore = {
  name: 'stub-react-devtools-core',
  setup(build: {
    onResolve: (
      args: { filter: RegExp },
      callback: (args: { path: string }) => { path: string; namespace: string } | undefined,
    ) => void;
    onLoad: (
      args: { filter: RegExp; namespace: string },
      callback: () => { contents: string; loader: 'js' },
    ) => void;
  }) {
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: 'react-devtools-core-stub',
      namespace: 'react-devtools-core-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'react-devtools-core-stub' }, () => ({
      contents: 'export default undefined;',
      loader: 'js',
    }));
  },
};

/**
 * Builds the executable entrypoints while preserving the dist paths referenced
 * by package bin declarations, launchers, and integration tests.
 */
const publishConfig = defineConfig({
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

/**
 * Builds standalone CLI and MCP bundles with dependencies inlined for copying
 * into project-local installs via `dist/local-bundle/`.
 */
export const localBundleConfig = defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    'mcp/server': 'src/mcp/server.ts',
  },
  outDir: 'dist/local-bundle',
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node24',
  splitting: false,
  sourcemap: true,
  noExternal: [/.*/],
  banner: {
    js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);`,
  },
  esbuildPlugins: [stubReactDevtoolsCore],
});

export default publishConfig;
