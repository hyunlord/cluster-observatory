import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.next-dev/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "**/out/**",
      "**/build/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["apps/observatory-web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
];
