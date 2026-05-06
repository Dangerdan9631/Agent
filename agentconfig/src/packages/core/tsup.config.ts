import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/built-in-plugins/*.plugin.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node24',
  splitting: false,
  sourcemap: true,
});
