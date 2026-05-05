import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    bin: 'src/bin.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node24',
  splitting: false,
  sourcemap: true,
});
