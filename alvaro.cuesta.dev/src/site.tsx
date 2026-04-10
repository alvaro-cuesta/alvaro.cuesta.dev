import type {
  XenonExpressRenderFunction,
  XenonExpressRenderMeta,
  XenonExpressSite,
} from "xenon-ssg-express/src";
import fs from "node:fs/promises";
import {
  BLOG_BLURB_DESCRIPTION,
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
  routeNow,
} from "./routes";
import { feedsPlugin } from "./plugins/feeds";
import { getBlogFeedSourceItems } from "./blog/feed-source";
import { makeTitle } from "./utils/meta";

export type SiteRenderMeta = XenonExpressRenderMeta & {
  defaultOgImage: string;
  woff2PreloadPaths: string[];
};

// TODO: changing the type here won't make the other fail
const render: XenonExpressRenderFunction<SitemapPluginMetadata> = (
  renderMeta,
) => {
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
  };

  const isHome = routeHome.match(siteRenderMeta.pathname);
  const is404 = route404.match(siteRenderMeta.pathname);
  const isNow = routeNow.match(siteRenderMeta.pathname);
  const isBlogArticle = routeBlogArticle.match(siteRenderMeta.pathname);
  const isBlogArticleList = routeBlogArticleList.match(siteRenderMeta.pathname);
  const isBlogGenericRoute =
    routeBlogTagList.match(siteRenderMeta.pathname) ||
    routeBlogTag.match(siteRenderMeta.pathname) ||
    routeBlogYearList.match(siteRenderMeta.pathname) ||
    routeBlogYear.match(siteRenderMeta.pathname);

  return {
    reactNode: <Root siteRenderMeta={siteRenderMeta} />,
    metadata: {
      [sitemapPluginKey]: is404
        ? { exclude: true }
        : isHome
          ? { priority: 1.0 }
          : isNow
            ? { priority: 0.8 }
            : isBlogArticleList
              ? { priority: 0.8 }
              : isBlogGenericRoute
                ? { priority: 0.6 }
                : isBlogArticle
                  ? { priority: 0.9 }
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
  const feeds = feedsPlugin({
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
  });

  const sitemap = sitemapPlugin({
    robotsTxtContent: await fs.readFile(
      path.join(import.meta.dirname, "robots.txt"),
      "utf-8",
    ),
    outputFilename: "sitemap.xml",
    additionalPathnames: () => feeds.getFeedSitemapPathnames(),
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
      feeds,
      sitemap,
    ],
  };
}
