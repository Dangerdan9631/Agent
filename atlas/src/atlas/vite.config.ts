import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the sandboxed Electron renderer with local diagram-rendering dependencies.
 */
export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
});
