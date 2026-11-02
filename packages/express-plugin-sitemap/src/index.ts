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
};

/**
 * A page's or a static file's sitemap entry.
 *
 * Pages are listed unless they're excluded. Static files are only listed with
 * an entry, as most aren't for search results (e.g. images or stylesheets).
 */
export type SitemapPluginMetadata = {
  [sitemapPluginKey]?: SitemapEntry | undefined;
};

type SitemapEntry = {
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
};

/**
 * A static file's sitemap entry.
 *
 * It can't be excluded, as having no entry already leaves the file out.
 */
export type SitemapPluginStaticFileMetadata = {
  [sitemapPluginKey]?:
    | (Omit<SitemapEntry, "exclude"> & {
        // `Extract`, not just `Omit`: a value typed as a page's entry can't
        // sneak an `exclude: true` in.
        exclude?: Extract<SitemapEntry["exclude"], false>;
      })
    | undefined;
};

export const sitemapPluginKey: unique symbol = Symbol("SitemapPlugin");

const toSitemapLoc = (baseUrl: string, pathname: string): string => {
  if (!pathname.startsWith("/")) {
    throw new Error(`[Sitemap] Pathname must start with "/": ${pathname}`);
  }

  return `${baseUrl}${pathname}`;
};

export const sitemapPlugin =
  ({
    robotsTxtContent,
    outputFilename,
    mountPointFragments = [],
    disableInjectMetaTag,
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

    const attachToExpress: PluginAttachToExpressFunction = (router) => {
      // Still answers, so the plugin isn't invisible in dev.
      // @todo Crawl the dev site when it's requested (in a cell, if that's
      // slow), so dev serves the same sitemap the build writes, from the same
      // code.
      router.get(pathname, async (_req, res) => {
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
        router.get("/robots.txt", async (_req, res) => {
          res.status(200).contentType("text/plain").end(robotsTxtContent);
        });
      }
    };

    const buildPost: PluginBuildPostFunction<
      void,
      SitemapPluginMetadata
    > = async ({ siteMeta, baseOutputFolder, generatedPages, staticFiles }) => {
      const outputFolder = path.join(baseOutputFolder, ...mountPointFragments);
      await fs.mkdir(outputFolder, { recursive: true });

      const outputFilepath = path.join(outputFolder, outputFilename);
      console.debug(`[Sitemap] ${outputFilepath}`);

      const root = create({ version: "1.0", encoding: "UTF-8" });

      const urlset = root.ele("urlset", {
        xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
      });

      const addUrl = (pathname: string, entry: SitemapEntry | undefined) => {
        const url = urlset.ele("url");

        url.ele("loc").txt(toSitemapLoc(siteMeta.baseUrl, pathname));

        if (entry?.lastModified !== undefined) {
          url.ele("lastmod").txt(entry.lastModified.toString());
        }

        if (entry?.changeFrequency !== undefined) {
          url.ele("changefreq").txt(entry.changeFrequency);
        }

        if (entry?.priority !== undefined) {
          url.ele("priority").txt(entry.priority.toString());
        }
      };

      for (const generatedPage of generatedPages) {
        const entry = generatedPage.metadata[sitemapPluginKey];
        if (entry?.exclude) continue;

        addUrl(generatedPage.pathname, entry);
      }

      for (const staticFile of staticFiles) {
        const entry = staticFile.metadata?.[sitemapPluginKey];
        if (entry === undefined || entry.exclude) continue;

        addUrl(staticFile.pathname, entry);
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
