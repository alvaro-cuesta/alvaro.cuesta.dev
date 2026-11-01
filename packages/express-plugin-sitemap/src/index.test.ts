import fs from "node:fs/promises";
import path from "node:path";
import vfs from "node:vfs";
import { describe, expect, it } from "vitest";
import type { XenonExpressSiteMeta } from "@xenon-ssg/express";
import {
  sitemapPlugin,
  sitemapPluginKey,
  type SitemapPluginMetadata,
} from "./index.ts";

// Missing from `@types/node` (as of 26.6.6).
declare module "node:vfs" {
  interface VirtualFileSystem {
    /** Mounts the file system at a path of its own and returns it. */
    mount(): string;
    /** Unmounts the file system. */
    [Symbol.dispose](): void;
  }
}

describe("sitemapPlugin", () => {
  it("omits generated pages explicitly excluded from the sitemap", async () => {
    using virtualFs = vfs.create({ emitExperimentalWarning: false });
    const baseOutputFolder = virtualFs.mount();

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

  it("writes robots.txt at the site's root, wherever the sitemap is", async () => {
    using virtualFs = vfs.create({ emitExperimentalWarning: false });
    const baseOutputFolder = virtualFs.mount();

    const siteMeta: XenonExpressSiteMeta = {
      origin: "https://example.com",
      basepath: "",
      baseUrl: "https://example.com",
    };

    const runnable = sitemapPlugin({
      outputFilename: "sitemap.xml",
      mountPointFragments: ["sitemaps"],
      robotsTxtContent: "User-agent: *\nAllow: /\n",
    })(siteMeta);

    await runnable?.buildPost?.({
      siteMeta,
      baseOutputFolder,
      buildPreResult: undefined,
      generatedPages: [{ pathname: "/", metadata: {} }],
    });

    expect(
      await fs.readFile(path.join(baseOutputFolder, "robots.txt"), "utf8"),
    ).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemaps/sitemap.xml\n",
    );
  });

  it("lists absolute URLs under a base path, and writes no robots.txt", async () => {
    using virtualFs = vfs.create({ emitExperimentalWarning: false });
    const baseOutputFolder = virtualFs.mount();

    const siteMeta: XenonExpressSiteMeta = {
      origin: "https://example.com",
      basepath: "/repo",
      baseUrl: "https://example.com/repo",
    };

    const runnable = sitemapPlugin({
      outputFilename: "sitemap.xml",
      robotsTxtContent: "User-agent: *\nAllow: /\n",
      additionalPathnames: ["/feed.rss"],
    })(siteMeta);

    await runnable?.buildPost?.({
      siteMeta,
      baseOutputFolder,
      buildPreResult: undefined,
      generatedPages: [{ pathname: "/blog/", metadata: {} }],
    });

    const sitemapXml = await fs.readFile(
      path.join(baseOutputFolder, "sitemap.xml"),
      "utf8",
    );

    expect(sitemapXml).toContain("<loc>https://example.com/repo/blog/</loc>");
    expect(sitemapXml).toContain(
      "<loc>https://example.com/repo/feed.rss</loc>",
    );
    await expect(
      fs.access(path.join(baseOutputFolder, "robots.txt")),
    ).rejects.toThrow();
  });
});
