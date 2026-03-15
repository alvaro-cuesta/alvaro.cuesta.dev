import fs from "node:fs/promises";
import path from "node:path";
import mock from "mock-fs";
import { afterEach, describe, expect, it } from "vitest";
import type { XenonExpressSiteMeta } from "..";
import {
  sitemapPlugin,
  sitemapPluginKey,
  type SitemapPluginMetadata,
} from "./sitemap";

describe("sitemapPlugin", () => {
  afterEach(() => {
    mock.restore();
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

    const baseOutputFolder = path.join(process.cwd(), "virtual-output");

    mock({
      [baseOutputFolder]: {},
    });

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
