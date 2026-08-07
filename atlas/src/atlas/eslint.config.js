import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import typescriptEslint from 'typescript-eslint';

/**
 * Defines static analysis for the Electron main, preload, and renderer layers.
 */
export default typescriptEslint.config(
  {
    ignores: ['**/*.js', 'vite.config.ts', 'dist/**', 'node_modules/**', 'scripts/**']
  },
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      'no-console': 'error',
      'import/no-cycle': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
);
