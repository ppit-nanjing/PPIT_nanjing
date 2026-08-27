import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Use <ConfirmButton> (src/components/console/confirm-button.tsx)
      // instead - window.confirm()/alert() can't be styled, get silently
      // suppressed by some browser settings, and block the whole tab's JS
      // thread while open. Not also banning window.prompt() here: it's
      // still used (unrelated to this rule's original motivation) in
      // src/components/documents/drive-explorer.tsx's rename flow - adding
      // it would need that call site migrated to an in-app input modal
      // first, which is a separate piece of work.
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Use <ConfirmButton> from @/components/console/confirm-button instead of window.confirm()." },
        { name: "alert", message: "Use an in-app error/toast instead of window.alert()." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "public/ocr/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
