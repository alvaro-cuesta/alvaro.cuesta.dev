import { describe, expect, it } from "vitest";
import { hotImport, hotImportsOf } from "./hot-import.ts";

// Without the hooks, as in production and here: they only load in the dev
// server (see `hooks.test.ts` for what they add).
describe("hotImport", () => {
  it("just calls `load`", async () => {
    const module = { value: 1 };
    const imported = hotImport(() => Promise.resolve(module));

    expect(await imported.load()).toBe(module);
  });

  it("tracks nothing", async () => {
    const imported = hotImport(() => Promise.resolve({}));
    using _subscription = imported.subscribe(() => {});
    await imported.load();

    expect(hotImportsOf(new Set([import.meta.filename]))).toEqual([]);
  });
});
