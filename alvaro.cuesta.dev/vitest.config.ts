import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: {
      // Resolve workspace packages to their sources instead of `dist/`.
      // Overrides Vite's `defaultServerConditions`, so repeat them here.
      conditions: ["source", "module", "node", "development|production"],
    },
  },
});
