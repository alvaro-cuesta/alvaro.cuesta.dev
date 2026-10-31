import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // For `node:vfs`, which tests use instead of the real file system.
    execArgv: ["--experimental-vfs"],
  },
  ssr: {
    resolve: {
      // Resolve workspace packages to their sources instead of `dist/`.
      // Overrides Vite's `defaultServerConditions`, so repeat them here.
      conditions: [
        "@xenon-ssg/source",
        "module",
        "node",
        "development|production",
      ],
    },
  },
});
