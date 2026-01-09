import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import prettier from "eslint-config-prettier";

/**
 * ESLint Flat Config for Vite + React + TypeScript (type-aware)
 * - Uses `typescript-eslint` recommendedTypeChecked rules
 * - React / React Hooks / a11y 권장 규칙 적용
 * - Prettier 충돌 규칙 해제 (eslint-config-prettier)
 */
export default tseslint.config(
  // Ignore patterns
  { ignores: ["dist", "build", "coverage", "node_modules"] },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript recommended with type-checking
  ...tseslint.configs.recommendedTypeChecked,

  // Project rules
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        // Enable type-aware linting (no need for explicit 'project' path in Flat Config)
        projectService: true,
        tsconfigRootDir: new URL("./", import.meta.url),
      },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Merge recommended rules explicitly for this fileset
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Project-specific adjustments (phase-1 reductions)
      "react/react-in-jsx-scope": "off",
      "no-undef": "off", // TS가 체크함

      // Function size and complexity limits for maintainability
      "max-lines-per-function": ["error", { "max": 7000, "skipBlankLines": true, "skipComments": true }],
      "complexity": ["warn", 150],
      "@typescript-eslint/no-explicit-any": "warn",

      // TS strictness step-down for migration
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } }
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "off", // 경고 끄기
      "@typescript-eslint/no-unsafe-argument": "off",      // 경고 끄기
      "@typescript-eslint/no-unsafe-assignment": "off",    // 경고 끄기
      "@typescript-eslint/no-explicit-any": "off",        // any 허용
      "@typescript-eslint/require-await": "off",
      "no-case-declarations": "off",
      "react/prop-types": "off",

      // Maintainability improvements
      "prefer-const": "error",
      "no-var": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Unused variables - allow _ prefix for intentionally unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
    },
  },

  // Disable formatting-related rules to avoid conflict with Prettier
  prettier
);


