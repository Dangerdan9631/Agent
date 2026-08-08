import { defineConfig } from 'vitest/config';

/**
 * Runs desktop boundary tests without loading Electron's graphical process.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts']
  }
});
