import fs from "node:fs/promises";
import path from "node:path";
import { version as packageVersion } from "../../../package.json" with { type: "json" };
import type {
  Plugin,
  PluginAttachToExpressFunction,
  PluginBuildPostFunction,
  PluginBuildPreFunction,
  PluginGetInjectableFunction,
  PluginInjectableTag,
} from "xenon-ssg-express/src/plugins/plugins";
import { serializeAtomDocument } from "./atom";
import { compileFeedPageModels } from "./content";
import { serializeJsonDocuments } from "./jsonfeed";
import {
  ALL_FEED_FORMATS,
  DEFAULT_MOUNT_POINT_FRAGMENTS,
  FEED_FORMATS,
  getFeedFormatRoute,
  getPaginatedFeedFormatRoutePath,
  getFeedSitemapPathnames as getFeedSitemapPathnamesForTotalPages,
  toAbsoluteUrl,
} from "./routes";
import { serializeRssDocument } from "./rss";
import type {
  FeedFormat,
  FeedPage,
  FeedContentOptions,
  FeedAuthor,
  FeedSourceItem,
} from "./types";

const DEFAULT_LANGUAGE = "en";
const DEFAULT_ITEMS_PER_PAGE = 10;
const DEFAULT_GENERATOR_NAME = "Xenon SSG";
const SITEMAP_COUNT_BASE_URL = "https://feeds.invalid";

type FeedGeneratorConfig = {
  name: string;
  uri?: string;
};

type SerializedFeedPage = {
  page: FeedPage;
  documents: Partial<Record<FeedFormat, string>>;
};

type FeedsBuildPreResult = {
  pages: SerializedFeedPage[];
};

const DEFAULT_CONTENT_OPTIONS: Required<FeedContentOptions> = {
  html: "full",
  text: "none",
};

type FeedContext = {
  baseUrl: string;
};

type FeedValueResolver<T> = T | ((context: FeedContext) => T);

type FeedItemsResolver<TMetadata = unknown> = (
  context: FeedContext,
) => Promise<FeedSourceItem<TMetadata>[]>;

export type FeedsPluginOptions<
  TFormat extends FeedFormat = FeedFormat,
  TMetadata = unknown,
> = {
  getItems: FeedItemsResolver<TMetadata>;
  homePagePathname: FeedValueResolver<string>;
  title: string;
  description: string;
  authors?: FeedValueResolver<FeedAuthor[]>;
  mountPointFragments?: string[];
  content?: FeedContentOptions;
  itemsPerPage?: number;
  language?: string;
  generator?: FeedGeneratorConfig;
  /** Which feed formats to generate. Defaults to all formats. */
  formats?: readonly TFormat[];
  /** Which feed formats to inject as `<link rel="alternate">`. Must be a subset of `formats`. Defaults to `formats`. */
  linkRelFormats?: readonly TFormat[];
  /** Which feed formats to include in the sitemap. Must be a subset of `formats`. Defaults to `formats`. */
  sitemapFormats?: readonly TFormat[];
};

export type FeedSitemapPathnamesOptions = {
  mountPointFragments?: string[];
  itemsPerPage?: number;
  totalItems?: number;
  getTotalItems?: () => Promise<number>;
  formats?: readonly FeedFormat[];
};

export type FeedsPlugin<TFormat extends FeedFormat = FeedFormat> =
  Plugin<FeedsBuildPreResult> & {
    getFeedSitemapPathnames: () => Promise<string[]>;
    relativeUrls: Record<TFormat, string>;
  };

function resolveContextValue<T>(
  value: FeedValueResolver<T>,
  context: FeedContext,
): T {
  return typeof value === "function"
    ? (value as (context: FeedContext) => T)(context)
    : value;
}

/** Compute sitemap pathnames for all feed pages based on feed item counts. */
async function resolveFeedSitemapPathnames({
  mountPointFragments = DEFAULT_MOUNT_POINT_FRAGMENTS,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  totalItems,
  getTotalItems,
  formats = ALL_FEED_FORMATS,
}: FeedSitemapPathnamesOptions = {}): Promise<string[]> {
  const resolvedTotalItems =
    totalItems ?? (getTotalItems ? await getTotalItems() : 0);
  const totalPages = Math.ceil(resolvedTotalItems / itemsPerPage);

  return getFeedSitemapPathnamesForTotalPages(
    totalPages,
    mountPointFragments,
    formats,
  );
}

/** Serialize one page model into the requested feed document formats. */
function serializeFeedPage(
  page: FeedPage,
  language: string,
  generator: FeedGeneratorConfig,
  formats: readonly FeedFormat[],
): SerializedFeedPage {
  const documents: Partial<Record<FeedFormat, string>> = {};

  if (formats.includes("jsonfeed")) {
    documents.jsonfeed = serializeJsonDocuments(page, language);
  }
  if (formats.includes("atom")) {
    documents.atom = serializeAtomDocument(page, language, {
      value: generator.name,
      version: packageVersion,
      ...(generator.uri ? { uri: generator.uri } : {}),
    });
  }
  if (formats.includes("rss")) {
    documents.rss = serializeRssDocument(page, language);
  }

  return { page, documents };
}

type CompileFeedsInput<TMetadata = unknown> = {
  baseUrl: string;
  getItems: FeedItemsResolver<TMetadata>;
  mountPointFragments: string[];
  itemsPerPage: number;
  language: string;
  title: string;
  description: string;
  homePagePathname: string;
  authors: FeedAuthor[];
  generator: FeedGeneratorConfig;
  content: Required<FeedContentOptions>;
  formats: readonly FeedFormat[];
};

/** Compile and serialize all feed pages for the current site state. */
async function compileFeeds<TMetadata = unknown>({
  baseUrl,
  getItems,
  mountPointFragments,
  itemsPerPage,
  language,
  title,
  description,
  homePagePathname,
  authors,
  generator,
  content,
  formats,
}: CompileFeedsInput<TMetadata>): Promise<SerializedFeedPage[]> {
  const pages = await compileFeedPageModels({
    baseUrl,
    getItems,
    mountPointFragments,
    itemsPerPage,
    title,
    description,
    homePagePathname,
    authors,
    content,
  });

  return pages.map((page) =>
    serializeFeedPage(page, language, generator, formats),
  );
}

/** Ensure output folder exists before writing serialized feed files. */
async function ensureParentFolder(filepath: string): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
}

/**
 * Feed plugin entry point. Generates JSON Feed, Atom and RSS outputs.
 */
export function feedsPlugin<
  const TFormat extends FeedFormat = FeedFormat,
  TMetadata = unknown,
>({
  getItems,
  homePagePathname,
  title,
  description,
  authors = [],
  mountPointFragments = DEFAULT_MOUNT_POINT_FRAGMENTS,
  content,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  language = DEFAULT_LANGUAGE,
  generator = { name: DEFAULT_GENERATOR_NAME },
  formats,
  linkRelFormats,
  sitemapFormats,
}: FeedsPluginOptions<TFormat, TMetadata>): FeedsPlugin<TFormat> {
  const resolvedFormats: readonly TFormat[] =
    formats ?? (ALL_FEED_FORMATS as readonly TFormat[]);
  const resolvedLinkRelFormats: readonly TFormat[] =
    linkRelFormats ?? resolvedFormats;
  const resolvedSitemapFormats: readonly TFormat[] =
    sitemapFormats ?? resolvedFormats;

  const invalidLinkRel = resolvedLinkRelFormats.filter(
    (format) => !resolvedFormats.includes(format),
  );
  if (invalidLinkRel.length > 0) {
    throw new Error(
      `feedsPlugin: linkRelFormats contains formats not listed in formats: ${invalidLinkRel.join(", ")}`,
    );
  }

  const invalidSitemap = resolvedSitemapFormats.filter(
    (format) => !resolvedFormats.includes(format),
  );
  if (invalidSitemap.length > 0) {
    throw new Error(
      `feedsPlugin: sitemapFormats contains formats not listed in formats: ${invalidSitemap.join(", ")}`,
    );
  }

  const relativeUrls = Object.fromEntries(
    resolvedFormats.map((format) => [
      format,
      getFeedFormatRoute(mountPointFragments, 1, format).pathname,
    ]),
  ) as Record<TFormat, string>;
  const getConfiguredFeedSitemapPathnames = async (): Promise<string[]> => {
    return resolveFeedSitemapPathnames({
      mountPointFragments,
      itemsPerPage,
      formats: resolvedSitemapFormats,
      totalItems: (
        await getItems({
          baseUrl: SITEMAP_COUNT_BASE_URL,
        })
      ).length,
    });
  };

  const plugin: FeedsPlugin<TFormat> = Object.assign(
    ({ baseUrl }: { baseUrl: string }) => {
      const context = { baseUrl };
      const resolvedContent: Required<FeedContentOptions> = {
        ...DEFAULT_CONTENT_OPTIONS,
        ...content,
      };
      const resolvedHomePagePathname = resolveContextValue(
        homePagePathname,
        context,
      );
      const resolvedAuthors = resolveContextValue(authors, context);

      const buildPre: PluginBuildPreFunction<FeedsBuildPreResult> = async ({
        emitStaticPathname,
      }) => {
        const pages = await compileFeeds({
          baseUrl,
          getItems,
          homePagePathname: resolvedHomePagePathname,
          authors: resolvedAuthors,
          mountPointFragments,
          itemsPerPage,
          content: resolvedContent,
          language,
          title,
          description,
          generator,
          formats: resolvedFormats,
        });

        // Every serialized feed document is written as a standalone static
        // file by `buildPost`, so the renderer should not crawl them as
        // React pages.
        for (const serializedPage of pages) {
          for (const format of resolvedFormats) {
            emitStaticPathname(serializedPage.page.routes[format].pathname);
          }
        }

        return { pages };
      };

      const attachToExpress: PluginAttachToExpressFunction = (app) => {
        const sendFeedPage = async (
          pageNumber: number,
        ): Promise<SerializedFeedPage | undefined> => {
          const pages = await compileFeeds({
            baseUrl,
            getItems,
            homePagePathname: resolvedHomePagePathname,
            authors: resolvedAuthors,
            mountPointFragments,
            itemsPerPage,
            content: resolvedContent,
            language,
            title,
            description,
            generator,
            formats: resolvedFormats,
          });

          return pages.find((entry) => entry.page.currentPage === pageNumber);
        };

        for (const format of resolvedFormats) {
          app.get(
            getFeedFormatRoute(mountPointFragments, 1, format).pathname,
            async (_req, res, next) => {
              try {
                const firstPage = await sendFeedPage(1);

                if (!firstPage) {
                  res.status(404).end();
                  return;
                }

                res
                  .status(200)
                  .contentType(firstPage.page.routes[format].contentType)
                  .end(firstPage.documents[format]);
              } catch (error) {
                next(error);
              }
            },
          );

          app.get(
            getPaginatedFeedFormatRoutePath(mountPointFragments, format),
            async (req, res, next) => {
              try {
                const page = req.params["page"];

                if (page === undefined) {
                  next();
                  return;
                }

                const pageNumber = Number.parseInt(page, 10);
                if (!Number.isFinite(pageNumber) || pageNumber < 2) {
                  next();
                  return;
                }

                const feedPage = await sendFeedPage(pageNumber);

                if (!feedPage) {
                  res.status(404).end();
                  return;
                }

                res
                  .status(200)
                  .contentType(feedPage.page.routes[format].contentType)
                  .end(feedPage.documents[format]);
              } catch (error) {
                next(error);
              }
            },
          );
        }
      };

      const buildPost: PluginBuildPostFunction<
        FeedsBuildPreResult,
        Record<string, unknown>
      > = async ({ baseOutputFolder, buildPreResult }) => {
        for (const serializedPage of buildPreResult.pages) {
          for (const format of resolvedFormats) {
            const document = serializedPage.documents[format];
            if (document === undefined) continue;

            const outputFilepath = path.join(
              baseOutputFolder,
              serializedPage.page.routes[format].outputRelativePath,
            );
            console.debug(`[Feed:${format}] ${outputFilepath}`);
            await ensureParentFolder(outputFilepath);
            await fs.writeFile(outputFilepath, document);
          }
        }
      };

      const getInjectable: PluginGetInjectableFunction<
        FeedsBuildPreResult
      > = (): PluginInjectableTag[] => {
        const formatLabels: Record<FeedFormat, string> = {
          rss: "RSS Feed",
          jsonfeed: "JSON Feed",
          atom: "Atom Feed",
        };

        return resolvedLinkRelFormats.map((format) => {
          const route = getFeedFormatRoute(mountPointFragments, 1, format);
          const formatTitle =
            resolvedLinkRelFormats.length > 1
              ? `${title} (${formatLabels[format]})`
              : title;

          return {
            tagType: "link",
            rel: "alternate",
            type: FEED_FORMATS[format].contentType,
            title: formatTitle,
            href: toAbsoluteUrl(baseUrl, route.pathname),
          };
        });
      };

      return {
        attachToExpress,
        buildPre,
        buildPost,
        getInjectable,
      };
    },
    {
      getFeedSitemapPathnames: getConfiguredFeedSitemapPathnames,
      relativeUrls,
    },
  );

  return plugin;
}
