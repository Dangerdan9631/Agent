import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import typescriptEslint from 'typescript-eslint';

/**
 * Defines the static-analysis rules for Atlas source and test files.
 */
export default typescriptEslint.config(
  {
    ignores: [
      '**/*.js',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'scripts/**',
      'tests/fixtures/**',
      'AGENTS.md',
      'spec.md'
    ]
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
