import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import typescriptEslint from "typescript-eslint";

/**
 * Defines static analysis for the dedicated TypeScript source-model generator.
 */
export default typescriptEslint.config(
  {
    ignores: ["**/*.js", "dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "no-console": "error",
      "import/no-cycle": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
