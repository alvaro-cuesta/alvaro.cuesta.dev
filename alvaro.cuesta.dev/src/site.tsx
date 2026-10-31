import type {
  XenonExpressRenderFunction,
  XenonExpressRenderMeta,
  XenonExpressSite,
} from "@xenon-ssg/express";
import fs from "node:fs/promises";
import {
  BLOG_BLURB_DESCRIPTION,
  TIMELINE_BLURB_DESCRIPTION,
  MY_NAME,
  RENDER_TO_STREAM_OPTIONS,
  SITE_SHORT_DESCRIPTION,
  SITE_TITLE,
} from "../config.ts";
import { staticFilePlugin } from "@xenon-ssg/express-plugin-static-file";
import { staticFolderPlugin } from "@xenon-ssg/express-plugin-static-folder";
import { singleLightningCssPlugin } from "@xenon-ssg/express-plugin-single-lightningcss";
import path from "node:path";
import url from "node:url";
import { faviconPlugin } from "@xenon-ssg/express-plugin-favicon";
import { createXenonCache } from "@xenon-ssg/express/cache";
import pkg from "../package.json" with { type: "json" };
const version = pkg.version;
import type { PluginInjectableLink } from "@xenon-ssg/express/plugin";
import { resolvePage, type PageDates } from "./Root.tsx";
import {
  sitemapPlugin,
  sitemapPluginKey,
  type SitemapPluginMetadata,
} from "@xenon-ssg/express-plugin-sitemap";
import {
  routeBlogArticleList,
  routeHome,
  routeTimelineList,
} from "./routes.ts";
import { feedsPlugin } from "@xenon-ssg/express-plugin-feeds";
import { getBlogFeedSourceItems } from "./blog/feed-source.tsx";
import { getTimelineFeedSourceItems } from "./timeline/feed-source.tsx";
import { makeTitle } from "./utils/meta.ts";
import { htmlToPlainText } from "./utils/html.ts";
import { blogItemDateToTemporalInstant } from "./utils/item-dates.ts";

export type SiteFeedUrls = {
  all: string;
  blog: string;
  timeline: string;
};

export type SiteRenderMeta = XenonExpressRenderMeta & {
  defaultOgImage: string;
  woff2PreloadPaths: string[];
  feedUrls: SiteFeedUrls;
  pageDates: Promise<PageDates>;
  pageNoindex: boolean;
};

type XenonExpressRenderFunctionInput = {
  feedUrls: SiteFeedUrls;
};

// TODO: changing the type here won't make the other fail
const makeRender =
  (
    input: XenonExpressRenderFunctionInput,
  ): XenonExpressRenderFunction<SitemapPluginMetadata> =>
  async (renderMeta) => {
    const defaultOgImageHref = renderMeta.injectableRaw?.find(
      (tag): tag is PluginInjectableLink =>
        tag.tagType === "link" &&
        tag.rel === "apple-touch-icon" &&
        tag.sizes === "1024x1024",
    )?.href;

    if (!defaultOgImageHref) {
      throw new Error(
        "Default og:image not found -- possibly the `favicon` plugin is missing or misconfigured",
      );
    }

    const page = await resolvePage(renderMeta.pathname);

    // Awaited by the meta tags and the sitemap. When they reject, so does the page's render,
    // which reports it.
    const pageDates = page.dates ?? Promise.resolve<PageDates>({});
    pageDates.catch(() => {});

    const siteRenderMeta: SiteRenderMeta = {
      ...renderMeta,
      defaultOgImage: `${renderMeta.baseUrl}${defaultOgImageHref}`,
      woff2PreloadPaths: [
        `${FONTAWESOME_MOUNT_POINT_PATH}/fa-solid-900.woff2`,
        `${FONTAWESOME_MOUNT_POINT_PATH}/fa-brands-400.woff2`,
      ],
      feedUrls: input.feedUrls,
      pageDates,
      pageNoindex: page.noindex === true,
    };

    return {
      reactNode: page.render(siteRenderMeta),
      metadata: pageDates.then((dates) => {
        const lastModified = dates.modified ?? dates.published;

        return {
          [sitemapPluginKey]: page.noindex
            ? { exclude: true }
            : {
                ...page.sitemap,
                lastModified:
                  lastModified === undefined
                    ? undefined
                    : blogItemDateToTemporalInstant(lastModified),
              },
        };
      }),
    };
  };

const PICO_FILE = "pico.blue.min.css";
const PICO_FILE_PATH = url.fileURLToPath(
  import.meta.resolve(`@picocss/pico/css/${PICO_FILE}`),
);
export const picoCss = staticFilePlugin({
  inputFilepath: PICO_FILE_PATH,
  outputFilename: PICO_FILE,
  mountPointFragments: ["css", "pico"],
  injectAs: "stylesheet",
  critical: true,
});

const FONTAWESOME_FILE = "all.min.css";
const FONTAWESOME_FILE_PATH = url.fileURLToPath(
  import.meta.resolve(`fontawesome-free/css/${FONTAWESOME_FILE}`),
);
export const fontAwesomeCss = staticFilePlugin({
  inputFilepath: FONTAWESOME_FILE_PATH,
  outputFilename: FONTAWESOME_FILE,
  mountPointFragments: ["css", "fontawesome", "css"],
  injectAs: "stylesheet",
  critical: true,
});

const FONTAWESOME_WEBFONTS_PATH = path.join(
  url.fileURLToPath(import.meta.resolve("fontawesome-free")),
  "..", // @hack for some reason main is `attribution.js`
  "webfonts",
);
const FONTAWESOME_MOUNT_POINT_FRAGMENTS = ["css", "fontawesome", "webfonts"];
const FONTAWESOME_MOUNT_POINT_PATH =
  "/" + FONTAWESOME_MOUNT_POINT_FRAGMENTS.join("/");
export const fontawesomeWebfontsFolder = staticFolderPlugin({
  inputFolder: FONTAWESOME_WEBFONTS_PATH,
  mountPointFragments: FONTAWESOME_MOUNT_POINT_FRAGMENTS,
});

const STATIC_FOLDER = path.join(import.meta.dirname, "..", "static");
export const staticFolder = staticFolderPlugin({
  inputFolder: STATIC_FOLDER,
});

const cache = await createXenonCache({ callerUrl: import.meta.url });

const INDEX_CSS_PATH = path.join(import.meta.dirname, "index.css");
const indexCss = singleLightningCssPlugin({
  inputFilepath: INDEX_CSS_PATH,
  outputFilename: "index.min.css",
  mountPointFragments: ["css"],
  critical: true,
});

const STARRY_NIGHT_FILE = "both";
const STARRY_NIGHT_FILE_PATH = url.fileURLToPath(
  import.meta.resolve(`@wooorm/starry-night/style/${STARRY_NIGHT_FILE}`),
);
const starryNightCss = singleLightningCssPlugin({
  inputFilepath: STARRY_NIGHT_FILE_PATH,
  outputFilename: `${STARRY_NIGHT_FILE}.css`,
  mountPointFragments: ["css", "starry-night"],
  critical: true,
});

const blogFeeds = feedsPlugin({
  getItems: ({ baseUrl }) => getBlogFeedSourceItems(baseUrl),
  homePagePathname: routeBlogArticleList.build({ page: null }),
  mountPointFragments: ["blog"],
  title: makeTitle(["Blog"], { disableReverse: true }),
  description: BLOG_BLURB_DESCRIPTION,
  authors: ({ baseUrl }) => [
    {
      name: MY_NAME,
      url: baseUrl,
    },
  ],
  content: {
    html: "full",
    text: "none",
  },
  linkRelFormats: ["atom"],
  sitemapFormats: ["atom"],
});

const timelineFeeds = feedsPlugin({
  getItems: ({ baseUrl }) => getTimelineFeedSourceItems(baseUrl),
  homePagePathname: routeTimelineList.build({ page: null }),
  mountPointFragments: ["timeline"],
  title: makeTitle(["Timeline"], { disableReverse: true }),
  description: TIMELINE_BLURB_DESCRIPTION,
  authors: ({ baseUrl }) => [
    {
      name: MY_NAME,
      url: baseUrl,
    },
  ],
  content: {
    html: "full",
    text: "full",
    htmlToText: htmlToPlainText,
  },
  linkRelFormats: ["atom"],
  sitemapFormats: ["atom"],
});

const allFeeds = feedsPlugin({
  getItems: async ({ baseUrl }) => {
    const [blogItems, timelineItems] = await Promise.all([
      getBlogFeedSourceItems(baseUrl),
      getTimelineFeedSourceItems(baseUrl),
    ]);

    // Exclude implicit (blog-generated) timeline items from the aggregate
    // feed since the blog posts are already included directly
    const nonImplicitTimelineItems = timelineItems.filter(
      (item) => !item.metadata?.implicit,
    );

    return [...blogItems, ...nonImplicitTimelineItems].sort((a, b) =>
      Temporal.Instant.compare(b.datePublished, a.datePublished),
    );
  },
  homePagePathname: routeHome.build({}),
  mountPointFragments: [],
  title: makeTitle(["All"], { disableReverse: true }),
  description: SITE_SHORT_DESCRIPTION,
  authors: ({ baseUrl }) => [
    {
      name: MY_NAME,
      url: baseUrl,
    },
  ],
  content: {
    html: "full",
    text: "none",
  },
  linkRelFormats: ["atom"],
  sitemapFormats: ["atom"],
});

const sitemap = sitemapPlugin({
  robotsTxtContent: await fs.readFile(
    path.join(import.meta.dirname, "robots.txt"),
    "utf-8",
  ),
  outputFilename: "sitemap.xml",
  additionalPathnames: async () => [
    ...(await allFeeds.getFeedSitemapPathnames()),
    ...(await blogFeeds.getFeedSitemapPathnames()),
    ...(await timelineFeeds.getFeedSitemapPathnames()),
  ],
});

const favicon = faviconPlugin({
  inputFilepath: path.join(import.meta.dirname, "favicon.svg"),
  cache,
  faviconOptions: {
    appName: SITE_TITLE,
    appShortName: SITE_TITLE,
    appDescription: SITE_SHORT_DESCRIPTION,
    developerName: MY_NAME,
    developerURL: "https://alvaro.cuesta.dev",
    background: "#13171f", // --pico-background-color
    theme_color: "#8999f9", // --pico-color
    display: "browser",
    version,
  },
});

const render = makeRender({
  feedUrls: {
    all: allFeeds.relativeUrls.atom,
    blog: blogFeeds.relativeUrls.atom,
    timeline: timelineFeeds.relativeUrls.atom,
  },
});

export function makeSite(): XenonExpressSite<SitemapPluginMetadata> {
  return {
    render,
    renderToStreamOptions: RENDER_TO_STREAM_OPTIONS,
    plugins: [
      favicon,
      staticFolder,
      picoCss,
      fontAwesomeCss,
      fontawesomeWebfontsFolder,
      indexCss,
      starryNightCss,
      allFeeds,
      blogFeeds,
      timelineFeeds,
      sitemap,
    ],
  };
}
