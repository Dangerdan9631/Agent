import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the offline viewer assets that generated diagram pages embed.
 */
export default defineConfig({
  plugins: [react()],
  root: 'src/viewer',
  build: {
    outDir: '../../dist/viewer',
    emptyOutDir: false
  }
});
