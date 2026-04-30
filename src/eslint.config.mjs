import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    },
  },
  {
    ignores: ['**/dist/**', 'node_modules/**', '**/tsup.config.ts', '**/eslint.config.mjs'],
  }
);
