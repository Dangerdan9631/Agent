import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/logging/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node24',
  splitting: false,
  sourcemap: true,
});
