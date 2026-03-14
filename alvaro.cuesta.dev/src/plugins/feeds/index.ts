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
  FeedPageRoutes,
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
  documents: Record<FeedFormat, string>;
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

type FeedItemsResolver = (context: FeedContext) => Promise<FeedSourceItem[]>;

export type FeedsPluginOptions = {
  getItems: FeedItemsResolver;
  homePagePathname: FeedValueResolver<string>;
  title: string;
  description: string;
  authors?: FeedValueResolver<FeedAuthor[]>;
  mountPointFragments?: string[];
  content?: FeedContentOptions;
  itemsPerPage?: number;
  language?: string;
  generator?: FeedGeneratorConfig;
};

export type FeedSitemapPathnamesOptions = {
  mountPointFragments?: string[];
  itemsPerPage?: number;
  totalItems?: number;
  getTotalItems?: () => Promise<number>;
};

export type FeedsPlugin = Plugin<FeedsBuildPreResult> & {
  getFeedSitemapPathnames: () => Promise<string[]>;
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
}: FeedSitemapPathnamesOptions = {}): Promise<string[]> {
  const resolvedTotalItems =
    totalItems ?? (getTotalItems ? await getTotalItems() : 0);
  const totalPages = Math.ceil(resolvedTotalItems / itemsPerPage);

  return getFeedSitemapPathnamesForTotalPages(totalPages, mountPointFragments);
}

/** Serialize one page model into all supported feed document formats. */
function serializeFeedPage(
  page: FeedPage,
  language: string,
  generator: FeedGeneratorConfig,
): SerializedFeedPage {
  const jsonFeedDocument = serializeJsonDocuments(page, language);
  const atomDocument = serializeAtomDocument(page, language, {
    value: generator.name,
    version: packageVersion,
    ...(generator.uri ? { uri: generator.uri } : {}),
  });
  const rssDocument = serializeRssDocument(page, language);

  return {
    page,
    documents: {
      jsonfeed: jsonFeedDocument,
      atom: atomDocument,
      rss: rssDocument,
    },
  };
}

/** Compile and serialize all feed pages for the current site state. */
async function compileFeeds({
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
}: Required<
  Pick<
    FeedsPluginOptions,
    | "getItems"
    | "title"
    | "description"
    | "mountPointFragments"
    | "itemsPerPage"
    | "language"
    | "generator"
  >
> & {
  baseUrl: string;
  homePagePathname: string;
  authors: FeedAuthor[];
  content: Required<FeedContentOptions>;
}): Promise<SerializedFeedPage[]> {
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

  return pages.map((page) => serializeFeedPage(page, language, generator));
}

/** Ensure output folder exists before writing serialized feed files. */
async function ensureParentFolder(filepath: string): Promise<void> {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
}

/**
 * Feed plugin entry point. Generates JSON Feed, Atom and RSS outputs.
 */
export function feedsPlugin({
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
}: FeedsPluginOptions): FeedsPlugin {
  const getConfiguredFeedSitemapPathnames = async (): Promise<string[]> => {
    return resolveFeedSitemapPathnames({
      mountPointFragments,
      itemsPerPage,
      totalItems: (
        await getItems({
          baseUrl: SITEMAP_COUNT_BASE_URL,
        })
      ).length,
    });
  };

  const plugin: FeedsPlugin = Object.assign(
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

      const buildPre: PluginBuildPreFunction<
        FeedsBuildPreResult
      > = async () => {
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
        });

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
          });

          return pages.find((entry) => entry.page.currentPage === pageNumber);
        };

        for (const format of Object.keys(FEED_FORMATS) as FeedFormat[]) {
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
          for (const format of Object.keys(
            serializedPage.documents,
          ) as FeedFormat[]) {
            const outputFilepath = path.join(
              baseOutputFolder,
              serializedPage.page.routes[format].outputRelativePath,
            );
            console.debug(`[Feed:${format}] ${outputFilepath}`);
            await ensureParentFolder(outputFilepath);
            await fs.writeFile(
              outputFilepath,
              serializedPage.documents[format],
            );
          }
        }
      };

      const getInjectable: PluginGetInjectableFunction<
        FeedsBuildPreResult
      > = (): PluginInjectableTag[] => {
        const firstPageRoutes: FeedPageRoutes = {
          jsonfeed: getFeedFormatRoute(mountPointFragments, 1, "jsonfeed"),
          atom: getFeedFormatRoute(mountPointFragments, 1, "atom"),
          rss: getFeedFormatRoute(mountPointFragments, 1, "rss"),
        };

        return [
          {
            tagType: "link",
            rel: "alternate",
            type: FEED_FORMATS.rss.contentType,
            title: `${title} (RSS Feed)`,
            href: toAbsoluteUrl(baseUrl, firstPageRoutes.rss.pathname),
          },
          {
            tagType: "link",
            rel: "alternate",
            type: FEED_FORMATS.jsonfeed.contentType,
            title: `${title} (JSON Feed)`,
            href: toAbsoluteUrl(baseUrl, firstPageRoutes.jsonfeed.pathname),
          },
          {
            tagType: "link",
            rel: "alternate",
            type: FEED_FORMATS.atom.contentType,
            title: `${title} (Atom Feed)`,
            href: toAbsoluteUrl(baseUrl, firstPageRoutes.atom.pathname),
          },
        ];
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
    },
  );

  return plugin;
}
