import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '.tmp/',
      'V0/',
      'src/*/dist/',
      'src/*/architecture/',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
    },
  },
  {
    files: [
      'example/.spec-n-roll/cli/bin/**/*.js',
      'example/.spec-n-roll/extensions/**/*.mjs',
    ],
    languageOptions: {
      globals: {
        clearTimeout: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['src/spec-n-roll-runtime/src/console-runtime-output-writer.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
);
