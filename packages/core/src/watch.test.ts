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

  it("keeps watching a file replaced by renaming another over it, and nothing else in its folder", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await using folder = await fs.mkdtempDisposable(
      path.join(os.tmpdir(), "xenon-watch-file-"),
    );
    const filePath = path.join(folder.path, "watched.txt");
    const tempPath = path.join(folder.path, "watched.txt.tmp");
    await fs.writeFile(filePath, "");
    let changes = 0;
    let change = Promise.withResolvers<void>();

    using _watch = watchInDev(filePath, () => {
      changes++;
      change.resolve();
    });

    await fs.writeFile(path.join(folder.path, "neighbour.txt"), "");
    await setTimeout(100);
    expect(changes).toBe(0);

    for (const content of ["first", "second"]) {
      change = Promise.withResolvers<void>();
      await fs.writeFile(tempPath, content);
      await fs.rename(tempPath, filePath);
      await change.promise;
    }

    expect(changes).toBeGreaterThanOrEqual(2);
  });

  it("sees a file that doesn't exist yet being created", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await using folder = await fs.mkdtempDisposable(
      path.join(os.tmpdir(), "xenon-watch-new-"),
    );
    const filePath = path.join(folder.path, "new.txt");
    const change = Promise.withResolvers<void>();

    using _watch = watchInDev(filePath, () => change.resolve());
    await fs.writeFile(filePath, "");

    await expect(change.promise).resolves.toBeUndefined();
  });
});
