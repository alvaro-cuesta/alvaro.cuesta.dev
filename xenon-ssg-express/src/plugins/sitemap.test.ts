import fs from "node:fs/promises";
import path from "node:path";
import vfs from "node:vfs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { XenonExpressSiteMeta } from "../index.tsx";
import {
  sitemapPlugin,
  sitemapPluginKey,
  type SitemapPluginMetadata,
} from "./sitemap.ts";

// Missing from `@types/node` (as of 26.6.6).
declare module "node:vfs" {
  interface VirtualFileSystem {
    /** Mounts the file system at a path of its own and returns it. */
    mount(): string;
    unmount(): void;
  }
}

describe("sitemapPlugin", () => {
  let virtualFs: vfs.VirtualFileSystem;
  let baseOutputFolder: string;

  beforeEach(() => {
    virtualFs = vfs.create({ emitExperimentalWarning: false });
    baseOutputFolder = virtualFs.mount();
  });

  afterEach(() => {
    virtualFs.unmount();
  });

  it("omits generated pages explicitly excluded from the sitemap", async () => {
    const siteMeta: XenonExpressSiteMeta = {
      origin: "https://example.com",
      basepath: "",
      baseUrl: "https://example.com",
    };

    const runnable = sitemapPlugin({ outputFilename: "sitemap.xml" })(siteMeta);

    if (!runnable?.buildPost) {
      throw new Error("Sitemap plugin did not expose buildPost.");
    }

    await runnable.buildPost({
      siteMeta,
      baseOutputFolder,
      buildPreResult: undefined,
      generatedPages: [
        {
          pathname: "/",
          metadata: {},
        },
        {
          pathname: "/404.html",
          metadata: {
            [sitemapPluginKey]: { exclude: true },
          } satisfies SitemapPluginMetadata,
        },
      ],
    });

    const sitemapXml = await fs.readFile(
      path.join(baseOutputFolder, "sitemap.xml"),
      "utf8",
    );

    expect(sitemapXml).toContain("<loc>https://example.com/</loc>");
    expect(sitemapXml).not.toContain("<loc>https://example.com/404.html</loc>");
  });
});
