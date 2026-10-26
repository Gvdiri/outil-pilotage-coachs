import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Les documents PDF utilisent <Text> de react-pdf (pas du DOM HTML) :
  // la règle no-unescaped-entities (spécifique au HTML) ne s'y applique pas.
  {
    files: ["lib/pdf/**/*.tsx"],
    rules: { "react/no-unescaped-entities": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
