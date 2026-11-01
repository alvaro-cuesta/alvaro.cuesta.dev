import path from "node:path";
import fs from "node:fs/promises";
import { create } from "xmlbuilder2";
import type {
  Plugin,
  PluginAttachToExpressFunction,
  PluginBuildPreFunction,
  PluginBuildPostFunction,
  PluginGetInjectableFunction,
} from "@xenon-ssg/express/plugin";

type SitemapPluginOptions = {
  /**
   * Written to `/robots.txt`, with a `Sitemap:` line for the sitemap.
   *
   * Only when the site is at the root of its origin: crawlers only read
   * `robots.txt` there, so under a base path it's up to whoever serves the
   * root. The build logs the `Sitemap:` line for them instead.
   */
  robotsTxtContent?: string;
  outputFilename: string;
  /**
   * The folder the sitemap is in. Per the sitemaps protocol, it can only list
   * URLs in that folder, unless a `robots.txt` points to it.
   */
  mountPointFragments?: string[];
  disableInjectMetaTag?: boolean;
  additionalPathnames?: string[] | (() => string[] | Promise<string[]>);
};

export type SitemapPluginMetadata = {
  [sitemapPluginKey]?:
    | {
        exclude?: boolean;
        lastModified?: Temporal.Instant | undefined;
        changeFrequency?:
          | "always"
          | "hourly"
          | "daily"
          | "weekly"
          | "monthly"
          | "yearly"
          | "never";
        priority?: number | undefined;
      }
    | undefined;
};

export const sitemapPluginKey: unique symbol = Symbol("SitemapPlugin");

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

const toSitemapLoc = (baseUrl: string, pathOrUrl: string): string => {
  const trimmed = pathOrUrl.trim();

  if (!trimmed) {
    throw new Error("[Sitemap] Path must not be empty.");
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith("/")) {
    throw new Error(
      `[Sitemap] Path must start with \"/\" or be an absolute URL: ${pathOrUrl}`,
    );
  }

  return `${baseUrl}${trimmed}`;
};

export const sitemapPlugin =
  ({
    robotsTxtContent,
    outputFilename,
    mountPointFragments = [],
    disableInjectMetaTag,
    additionalPathnames = [],
  }: SitemapPluginOptions): Plugin<void, SitemapPluginMetadata> =>
  (siteMeta) => {
    const pathname = `/${[...mountPointFragments, outputFilename].join("/")}`;
    // Only at the origin's root, the one place crawlers read it from.
    const servedRobotsTxtContent =
      siteMeta.basepath === "" ? robotsTxtContent : undefined;

    const buildPre: PluginBuildPreFunction<void> = async ({
      emitStaticPathname,
    }) => {
      emitStaticPathname(pathname);
      if (servedRobotsTxtContent) {
        emitStaticPathname("/robots.txt");
      }
    };

    const attachToExpress: PluginAttachToExpressFunction = (app) => {
      app.get(pathname, async (_req, res) => {
        res
          .status(404)
          .contentType("text/plain")
          .end(
            [
              "Sitemap is unavailable in dev mode.",
              "Reason: sitemap.xml is generated from the full crawled URL graph only available in build mode.",
              "Run the build command to generate sitemap.xml.",
            ].join("\n"),
          );
      });

      if (servedRobotsTxtContent) {
        app.get("/robots.txt", async (_req, res) => {
          res.status(200).contentType("text/plain").end(robotsTxtContent);
        });
      }
    };

    const resolveAdditionalPathnames = async (): Promise<string[]> => {
      return typeof additionalPathnames === "function"
        ? await additionalPathnames()
        : additionalPathnames;
    };

    const buildPost: PluginBuildPostFunction<
      void,
      SitemapPluginMetadata
    > = async ({ siteMeta, baseOutputFolder, generatedPages }) => {
      const outputFolder = path.join(baseOutputFolder, ...mountPointFragments);
      await fs.mkdir(outputFolder, { recursive: true });

      const outputFilepath = path.join(outputFolder, outputFilename);
      console.debug(`[Sitemap] ${outputFilepath}`);

      const root = create({ version: "1.0", encoding: "UTF-8" });

      const urlset = root.ele("urlset", {
        xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
      });

      for (const generatedPage of generatedPages) {
        if (generatedPage.metadata[sitemapPluginKey]?.exclude) {
          continue;
        }

        const url = urlset.ele("url");

        url
          .ele("loc")
          .txt(toSitemapLoc(siteMeta.baseUrl, generatedPage.pathname));

        if (
          generatedPage.metadata[sitemapPluginKey]?.lastModified !== undefined
        ) {
          url
            .ele("lastmod")
            .txt(
              generatedPage.metadata[sitemapPluginKey].lastModified.toString(),
            );
        }

        if (
          generatedPage.metadata[sitemapPluginKey]?.changeFrequency !==
          undefined
        ) {
          url
            .ele("changefreq")
            .txt(generatedPage.metadata[sitemapPluginKey].changeFrequency);
        }

        if (generatedPage.metadata[sitemapPluginKey]?.priority !== undefined) {
          url
            .ele("priority")
            .txt(generatedPage.metadata[sitemapPluginKey].priority.toString());
        }
      }

      for (const additionalPathname of await resolveAdditionalPathnames()) {
        const url = urlset.ele("url");

        url.ele("loc").txt(toSitemapLoc(siteMeta.baseUrl, additionalPathname));
      }

      const xml = root.end();

      await fs.writeFile(outputFilepath, xml);

      // Absolute, as the robots.txt spec requires.
      const sitemapLine = `Sitemap: ${siteMeta.baseUrl}${pathname}`;

      if (servedRobotsTxtContent) {
        const realRobotsTxtContent = `${servedRobotsTxtContent}
${servedRobotsTxtContent.endsWith("\n") ? "" : "\n"}${sitemapLine}\n`;

        // At the site's root, wherever the sitemap is.
        const robotsTxtOutputFilepath = path.join(
          baseOutputFolder,
          "robots.txt",
        );
        console.debug(`[Sitemap] ${robotsTxtOutputFilepath}`);
        await fs.writeFile(robotsTxtOutputFilepath, realRobotsTxtContent);
      } else if (robotsTxtContent) {
        console.warn(
          `[Sitemap] No robots.txt under a base path (${siteMeta.basepath}): crawlers only read the origin's. Add this to it instead:\n  ${sitemapLine}`,
        );
      }
    };

    const getInjectable: PluginGetInjectableFunction<void> | undefined =
      !disableInjectMetaTag
        ? (options) =>
            options.isBuild
              ? [
                  {
                    tagType: "link",
                    rel: "sitemap",
                    type: "application/xml",
                    title: "Sitemap",
                    href: `${options.siteMeta.baseUrl}${pathname}`,
                  },
                ]
              : undefined
        : undefined;

    return {
      attachToExpress,
      buildPre,
      buildPost,
      getInjectable,
    };
  };
