import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';
import typescript from '@rollup/plugin-typescript';

// Disable esbuild in favour of @rollup/plugin-typescript which supports
// emitDecoratorMetadata (required by tsyringe).
export default defineConfig({
  esbuild: false,
  server: {
    port: 5174,
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
  build: {
    rollupOptions: {
      plugins: [
        typescript({ tsconfig: './tsconfig.json' }),
      ],
    },
  },
});
