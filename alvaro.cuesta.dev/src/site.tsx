import type {
  XenonExpressRenderFunction,
  XenonExpressRenderMeta,
  XenonExpressSite,
} from "xenon-ssg-express/src";
import fs from "node:fs/promises";
import { RENDER_TO_STREAM_OPTIONS } from "../config";
import { staticFilePlugin } from "xenon-ssg-express/src/plugins/static-file";
import { staticFolderPlugin } from "xenon-ssg-express/src/plugins/static-folder";
import { singleLightningCssPlugin } from "xenon-ssg-express/src/plugins/single-lightningcss";
import path from "node:path";
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
  routeHome,
} from "./routes";

export type SiteRenderMeta = XenonExpressRenderMeta & {
  defaultOgImage: string;
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

  const siteRenderMeta = {
    ...renderMeta,
    defaultOgImage: `${renderMeta.baseUrl}${defaultOgImageHref}`,
  };

  const isHome = routeHome.match(siteRenderMeta.pathname);
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
      [sitemapPluginKey]: isHome
        ? { priority: 1.0 }
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
const PICO_FILE_PATH = require.resolve(`@picocss/pico/css/${PICO_FILE}`);
export const picoCss = staticFilePlugin({
  inputFilepath: PICO_FILE_PATH,
  outputFilename: PICO_FILE,
  mountPointFragments: ["css", "pico"],
  injectAs: "stylesheet",
  critical: true,
});

const FONTAWESOME_FILE = "all.min.css";
const FONTAWESOME_FILE_PATH = require.resolve(
  `fontawesome-free/css/${FONTAWESOME_FILE}`,
);
export const fontAwesomeCss = staticFilePlugin({
  inputFilepath: FONTAWESOME_FILE_PATH,
  outputFilename: FONTAWESOME_FILE,
  mountPointFragments: ["css", "fontawesome", "css"],
  injectAs: "stylesheet",
  critical: true,
});

const FONTAWESOME_WEBFONTS_PATH = path.join(
  require.resolve("fontawesome-free"),
  "..", // @hack for some reason main is `attribution.js`
  "webfonts",
);
export const fontawesomeWebfontsFolder = staticFolderPlugin({
  inputFolder: FONTAWESOME_WEBFONTS_PATH,
  mountPointFragments: ["css", "fontawesome", "webfonts"],
});

/*
const STATIC_FOLDER = path.join(__dirname, "..", "static");
export const staticFolder = staticFolderPlugin({
  inputFolder: STATIC_FOLDER,
});
*/

const INDEX_CSS_PATH = path.join(__dirname, "index.css");
export const indexCss = singleLightningCssPlugin({
  inputFilepath: INDEX_CSS_PATH,
  outputFilename: "index.min.css",
  mountPointFragments: ["css"],
  critical: true,
});

const STARRY_NIGHT_FILE = "both";
const STARRY_NIGHT_FILE_PATH = require.resolve(
  `@wooorm/starry-night/style/${STARRY_NIGHT_FILE}`,
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
  const sitemap = sitemapPlugin({
    robotsTxtContent: await fs.readFile(
      path.join(__dirname, "robots.txt"),
      "utf-8",
    ),
    outputFilename: "sitemap.xml",
  });

  const favicon = await faviconPlugin({
    inputFilepath: path.join(__dirname, "favicon.svg"),
    faviconOptions: {
      appName: "Álvaro Cuesta",
      appShortName: "Álvaro Cuesta",
      appDescription: "Álvaro Cuesta's personal website",
      developerName: "Álvaro Cuesta",
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
      // staticFolder,
      picoCss,
      fontAwesomeCss,
      fontawesomeWebfontsFolder,
      indexCss,
      starryNightCss,
      sitemap,
    ],
  };
}
