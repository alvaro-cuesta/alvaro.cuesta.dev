import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

// Vitest doesn't run Node's module hooks, so this runs a script in Node with
// them.
const runWithHooks = async (files: Record<string, string>) => {
  await using folder = await fs.mkdtempDisposable(
    path.join(os.tmpdir(), "xenon-file-hooks-"),
  );
  for (const [name, source] of Object.entries(files)) {
    await fs.writeFile(path.join(folder.path, name), source);
  }
  const { stdout } = await promisify(execFile)(process.execPath, [
    "--import",
    new URL("./hooks.ts", import.meta.url).href,
    path.join(folder.path, "main.mjs"),
  ]);
  return JSON.parse(stdout) as unknown;
};

describe("hooks", () => {
  it("give a file's URL, without loading it", async () => {
    const result = await runWithHooks({
      // Loading it as a module would throw.
      "page.mjs": `throw new Error("loaded");`,
      "main.mjs": `
        import file from "./page.mjs" with { type: "url" };
        const again = await import("./page.mjs", { with: { type: "url" } });

        console.log(JSON.stringify({
          isUrl: file instanceof URL,
          isPage: file.href === new URL("./page.mjs", import.meta.url).href,
          isSameInstance: again.default === file,
        }));
      `,
    });

    expect(result).toEqual({
      isUrl: true,
      isPage: true,
      isSameInstance: true,
    });
  });

  it("fail for a file that doesn't exist", async () => {
    await expect(
      runWithHooks({
        "main.mjs": `import file from "./missing.txt" with { type: "url" };`,
      }),
    ).rejects.toThrow(/ERR_MODULE_NOT_FOUND/);
  });
});
