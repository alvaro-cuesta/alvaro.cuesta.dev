import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateStaticSite } from "./generate.tsx";

let outputDir: string;

beforeEach(async () => {
  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "xenon-generate-"));
});

afterEach(async () => {
  await fs.rm(outputDir, { recursive: true, force: true });
});

describe("generateStaticSite", () => {
  test("awaits a page's metadata after rendering it", async () => {
    let resolveMetadata!: (metadata: { renderedBy: string }) => void;
    const metadata = new Promise<{ renderedBy: string }>((resolve) => {
      resolveMetadata = resolve;
    });

    function Page() {
      resolveMetadata({ renderedBy: "Page" });
      return <p>Hello</p>;
    }

    const generatedPages = await generateStaticSite(
      () => ({ reactNode: <Page />, metadata }),
      { outputDir },
    );

    expect(generatedPages).toEqual([
      { pathname: "/", metadata: { renderedBy: "Page" } },
    ]);
  });

  test("reports a failing render's error, not its metadata's", async () => {
    function Page(): never {
      throw new Error("render failed");
    }

    await expect(
      generateStaticSite(
        () => ({
          reactNode: <Page />,
          metadata: Promise.reject(new Error("metadata failed")),
        }),
        { outputDir },
      ),
    ).rejects.toThrow("render failed");
    // Nor leaves its temporary file behind.
    expect(await fs.readdir(outputDir)).toEqual([]);
  });

  // Rejecting before the page renders, so this also fails on an unhandled rejection.
  test("rejects with a page's metadata error", async () => {
    await expect(
      generateStaticSite(
        () => ({
          reactNode: <p>Hello</p>,
          metadata: Promise.reject(new Error("metadata failed")),
        }),
        { outputDir },
      ),
    ).rejects.toThrow("metadata failed");
  });
});
