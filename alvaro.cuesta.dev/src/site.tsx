import type {
  XenonExpressRenderFunction,
  XenonExpressRenderMeta,
  XenonExpressSite,
} from "xenon-ssg-express/src";
import fs from "node:fs/promises";
import {
  BLOG_BLURB_DESCRIPTION,
  TIMELINE_BLURB_DESCRIPTION,
  MY_NAME,
  RENDER_TO_STREAM_OPTIONS,
  SITE_SHORT_DESCRIPTION,
  SITE_TITLE,
} from "../config";
import { staticFilePlugin } from "xenon-ssg-express/src/plugins/static-file";
import { staticFolderPlugin } from "xenon-ssg-express/src/plugins/static-folder";
import { singleLightningCssPlugin } from "xenon-ssg-express/src/plugins/single-lightningcss";
import path from "node:path";
import url from "node:url";
import { faviconPlugin } from "xenon-ssg-express/src/plugins/favicon";
import { version } from "../package.json" with { type: "json" };
import type { PluginInjectableLink } from "xenon-ssg-express/src/plugins/plugins";
import { Root } from "./components/Root";
import {
  sitemapPlugin,
  sitemapPluginKey,
  type SitemapPluginMetadata,
} from "xenon-ssg-express/src/plugins/sitemap";
import {
  routeBlogArticle,
  routeBlogArticleList,
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
  route404,
  routeHome,
  routeTimelinePost,
  routeTimelineList,
  routeTimelineTag,
  routeTimelineTagList,
  routeTimelineYear,
  routeTimelineYearList,
  routeNow,
} from "./routes";
import { feedsPlugin } from "./plugins/feeds";
import { compareInstants } from "./plugins/feeds/dates";
import { getBlogFeedSourceItems } from "./blog/feed-source";
import { getTimelineFeedSourceItems } from "./timeline/feed-source";
import { makeTitle } from "./utils/meta";

export type SiteFeedUrls = {
  all: string;
  blog: string;
  timeline: string;
};

export type SiteRenderMeta = XenonExpressRenderMeta & {
  defaultOgImage: string;
  woff2PreloadPaths: string[];
  feedUrls: SiteFeedUrls;
};

type XenonExpressRenderFunctionInput = {
  feedUrls: SiteFeedUrls;
};

// TODO: changing the type here won't make the other fail
const render =
  (
    input: XenonExpressRenderFunctionInput,
  ): XenonExpressRenderFunction<SitemapPluginMetadata> =>
  (renderMeta) => {
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

    const siteRenderMeta: SiteRenderMeta = {
      ...renderMeta,
      defaultOgImage: `${renderMeta.baseUrl}${defaultOgImageHref}`,
      woff2PreloadPaths: [
        `${FONTAWESOME_MOUNT_POINT_PATH}/fa-solid-900.woff2`,
        `${FONTAWESOME_MOUNT_POINT_PATH}/fa-brands-400.woff2`,
      ],
      feedUrls: input.feedUrls,
    };

    const isHome = routeHome.match(siteRenderMeta.pathname);
    const is404 = route404.match(siteRenderMeta.pathname);
    const isNow = routeNow.match(siteRenderMeta.pathname);

    const isHighSignalPage = isNow;

    // Blog
    const blogArticleListMatch = routeBlogArticleList.match(
      siteRenderMeta.pathname,
    );

    const isBlogArticle = routeBlogArticle.match(siteRenderMeta.pathname);
    const isBlogArticleFrontpage =
      blogArticleListMatch !== null &&
      (blogArticleListMatch.page === null || blogArticleListMatch.page === 1);
    const isBlogGenericRoute =
      routeBlogTagList.match(siteRenderMeta.pathname) ||
      routeBlogTag.match(siteRenderMeta.pathname) ||
      routeBlogYearList.match(siteRenderMeta.pathname) ||
      routeBlogYear.match(siteRenderMeta.pathname);
    const isBlogPagination =
      blogArticleListMatch !== null &&
      blogArticleListMatch.page &&
      blogArticleListMatch.page > 1;

    // Timeline
    const timelineListMatch = routeTimelineList.match(
      siteRenderMeta.pathname,
    );

    const isTimelinePost = routeTimelinePost.match(siteRenderMeta.pathname);
    const isTimelineFrontpage =
      timelineListMatch !== null &&
      (timelineListMatch.page === null || timelineListMatch.page === 1);
    const timelineTagMatch = routeTimelineTag.match(siteRenderMeta.pathname);
    const timelineYearMatch = routeTimelineYear.match(
      siteRenderMeta.pathname,
    );
    const isTimelineGenericRoute =
      routeTimelineTagList.match(siteRenderMeta.pathname) ||
      (timelineTagMatch &&
        (!timelineTagMatch.page || timelineTagMatch.page <= 1)) ||
      routeTimelineYearList.match(siteRenderMeta.pathname) ||
      (timelineYearMatch &&
        (!timelineYearMatch.page || timelineYearMatch.page <= 1));
    const isTimelinePagination =
      (timelineListMatch !== null &&
        timelineListMatch.page &&
        timelineListMatch.page > 1) ||
      (timelineTagMatch &&
        timelineTagMatch.page &&
        timelineTagMatch.page > 1) ||
      (timelineYearMatch &&
        timelineYearMatch.page &&
        timelineYearMatch.page > 1);

    return {
      reactNode: <Root siteRenderMeta={siteRenderMeta} />,
      metadata: {
        [sitemapPluginKey]: is404
          ? { exclude: true }
          : isHome
            ? { priority: 1.0 }
            : isHighSignalPage
              ? { priority: 0.9 }
              : isBlogArticle
                ? { priority: 0.85 }
                : isTimelinePost
                  ? { priority: 0.8 }
                  : isBlogArticleFrontpage || isTimelineFrontpage
                    ? { priority: 0.7 }
                    : isBlogGenericRoute || isTimelineGenericRoute
                      ? { priority: 0.3 }
                      : isBlogPagination || isTimelinePagination
                        ? { priority: 0.2 }
                        : undefined,
      },
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

const INDEX_CSS_PATH = path.join(import.meta.dirname, "index.css");
export const indexCss = singleLightningCssPlugin({
  inputFilepath: INDEX_CSS_PATH,
  outputFilename: "index.min.css",
  mountPointFragments: ["css"],
  critical: true,
});

const STARRY_NIGHT_FILE = "both";
const STARRY_NIGHT_FILE_PATH = url.fileURLToPath(
  import.meta.resolve(`@wooorm/starry-night/style/${STARRY_NIGHT_FILE}`),
);
export const starryNightCss = singleLightningCssPlugin({
  inputFilepath: STARRY_NIGHT_FILE_PATH,
  outputFilename: `${STARRY_NIGHT_FILE}.css`,
  mountPointFragments: ["css", "starry-night"],
  critical: true,
});

export async function makeSite(): Promise<
  XenonExpressSite<SitemapPluginMetadata>
> {
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
        compareInstants(b.datePublished, a.datePublished),
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

  const favicon = await faviconPlugin({
    inputFilepath: path.join(import.meta.dirname, "favicon.svg"),
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

  return {
    render: render({
      feedUrls: {
        all: allFeeds.relativeUrls.atom,
        blog: blogFeeds.relativeUrls.atom,
        timeline: timelineFeeds.relativeUrls.atom,
      },
    }),
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
