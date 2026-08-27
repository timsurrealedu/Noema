import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["test/**/*.js"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/pdf.worker.min.mjs"]),
]);
