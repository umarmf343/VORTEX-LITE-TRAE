import tsParser from "@typescript-eslint/parser"

export default [
  {
    ignores: ["**/.next/**", "node_modules/**", "dist/**", "public/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        console: "readonly",
      },
    },
    rules: {},
  },
]
