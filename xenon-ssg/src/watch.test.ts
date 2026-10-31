import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { watchInDev } from "./watch.ts";

describe("watchInDev", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stops watching, quietly, once disposed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn");
    await using folder = await fs.mkdtempDisposable(
      path.join(os.tmpdir(), "xenon-watch-"),
    );
    const changedFilenames: string[] = [];
    const firstChange = Promise.withResolvers<void>();

    {
      using _watch = watchInDev(folder.path, ({ filename }) => {
        if (filename !== null) changedFilenames.push(filename);
        firstChange.resolve();
      });
      await fs.writeFile(path.join(folder.path, "before.txt"), "");
      await firstChange.promise;
    }
    await fs.writeFile(path.join(folder.path, "after.txt"), "");
    await setTimeout(100);

    expect(changedFilenames).toContain("before.txt");
    expect(changedFilenames).not.toContain("after.txt");
    expect(warn).not.toHaveBeenCalled();
  });
});
