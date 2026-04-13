import type { Express } from "express";
import favicons, {
  type FaviconFile,
  type FaviconImage,
  type FaviconOptions,
  type FaviconResponse,
} from "favicons";
import type {
  PluginInjectableTag,
  Plugin,
  PluginGetInjectableFunction,
  PluginBuildPreFunction,
} from "./plugins";
import path from "node:path";
import fs from "node:fs/promises";
import { cachedPromise } from "xenon-ssg/src/promise";
import {
  getCacheBustedFilename,
  getCacheBustingFragmentContent,
} from "../cache-busting";
import { getContentHash } from "../crypto";
import type { XenonCache } from "../cache";

const LINK_REGEX =
  /<link\s+rel="(?<rel>.+?)"\s+(?:type="(?<type>.+?)"\s+)?(?:sizes="(?<sizes>.+?)"\s+)?(?:media="(?<media>.+?)"\s+)?href="(?<href>.+?)">/;

const META_REGEX = /<meta\s+name="(?<name>.+?)"\s+content="(?<content>.+?)">/;

const parseHtmlTag = (tag: string): PluginInjectableTag => {
  const linkResult = LINK_REGEX.exec(tag);
  if (linkResult !== null) {
    return {
      tagType: "link" as const,
      rel: linkResult.groups!["rel"]!, // `!` is fine because it's marked as non-optional group in the regex
      sizes: linkResult.groups!["sizes"],
      media: linkResult.groups!["media"],
      href: linkResult.groups!["href"]!, // `!` is fine because it's marked as non-optional group in the regex
    };
  }

  const metaResult = META_REGEX.exec(tag);
  if (metaResult !== null) {
    return {
      tagType: "meta" as const,
      name: metaResult.groups!["name"]!, // `!` is fine because it's marked as non-optional group in the regex
      content: metaResult.groups!["content"]!, // `!` is fine because it's marked as non-optional group in the regex
    };
  }

  throw new Error(`Unknown tag: ${tag}`);
};

type FaviconPluginOptions = {
  inputFilepath: string;
  faviconOptions: Omit<FaviconOptions, "cacheBustingQueryParam">;
  mountPointFragments?: string[];
  /**
   * - `string` to manually control fragment
   * - `false` to disable cache busting
   * - `undefined` to calculate from input file hash
   */
  cacheBustingFragment?: string | false | undefined;
  /**
   * Optional shared cache from `createXenonCache(...)`. When provided, the
   * expensive `favicons()` call is memoized to disk under
   * `<siteRoot>/node_modules/.cache/xenon-ssg-express/favicon/`, keyed by a
   * hash of the input SVG contents plus the `faviconOptions`. Pass `null` (or
   * omit) to disable caching.
   */
  cache?: XenonCache | null;
};

type FaviconPluginBuildPreResult = {
  cacheBustingMap: Record<string, string>;
};

type CachedFaviconResponse = {
  images: { name: string; contents: string /* base64 */ }[];
  files: { name: string; contents: string }[];
  html: string[];
};

const serializeFaviconResponse = (response: FaviconResponse): string => {
  const serializable: CachedFaviconResponse = {
    images: response.images.map((img) => ({
      name: img.name,
      contents: img.contents.toString("base64"),
    })),
    files: response.files.map((file) => ({
      name: file.name,
      contents: file.contents,
    })),
    html: [...response.html],
  };
  return JSON.stringify(serializable);
};

const deserializeFaviconResponse = (raw: Buffer): FaviconResponse => {
  const cached = JSON.parse(raw.toString("utf-8")) as CachedFaviconResponse;
  const images: FaviconImage[] = cached.images.map((img) => ({
    name: img.name,
    contents: Buffer.from(img.contents, "base64"),
  }));
  const files: FaviconFile[] = cached.files.map((file) => ({
    name: file.name,
    contents: file.contents,
  }));
  return { images, files, html: cached.html };
};

const getFaviconCacheKey = async (
  inputFilepath: string,
  faviconOptions: FaviconPluginOptions["faviconOptions"],
): Promise<string> => {
  const svgContents = await fs.readFile(inputFilepath);
  const payload = Buffer.concat([
    svgContents,
    Buffer.from("\0"),
    Buffer.from(JSON.stringify(faviconOptions)),
  ]);
  return getContentHash(payload, "hex");
};

type FaviconDerivedState = {
  response: FaviconResponse;
  /** Merged images + files lookup, precomputed once per reset. */
  filesByName: Record<string, Buffer | string>;
  /** Parsed `<link>` / `<meta>` tags for dev-mode injection. Build mode has
   * to rewrite hrefs against the cacheBustingMap per invocation and so
   * reparses from `response.html` itself. */
  parsedHtmlDev: PluginInjectableTag[];
};

export const faviconPlugin = ({
  inputFilepath,
  faviconOptions,
  mountPointFragments = [],
  cacheBustingFragment,
  cache,
}: FaviconPluginOptions): Plugin<FaviconPluginBuildPreResult> => {
  const resolveState = async (): Promise<FaviconDerivedState> => {
    const ns = cache?.namespace("favicon") ?? null;
    const cacheKey = ns
      ? `${await getFaviconCacheKey(inputFilepath, faviconOptions)}.json`
      : null;

    let response: FaviconResponse | null = null;
    if (ns && cacheKey) {
      const cached = await ns.get(cacheKey);
      if (cached !== null) {
        response = deserializeFaviconResponse(cached);
      }
    }
    if (response === null) {
      response = await favicons(inputFilepath, faviconOptions);
      if (ns && cacheKey) {
        await ns.set(cacheKey, serializeFaviconResponse(response));
      }
    }

    const filesByName: Record<string, Buffer | string> = {
      ...Object.fromEntries(
        response.images.map((image) => [image.name, image.contents]),
      ),
      ...Object.fromEntries(
        response.files.map((file) => [file.name, file.contents]),
      ),
    };
    const parsedHtmlDev = response.html.map(parseHtmlTag);
    return { response, filesByName, parsedHtmlDev };
  };

  // In-memory memoization of `favicons()` + all the derived shapes
  // (`filesByName`, parsed html). `state.get()` returns the same Promise
  // instance until `state.reset()` is called — so `getInjectable` doesn't
  // re-parse the html list, the request handler doesn't rebuild
  // `filesByName`, and `buildPre` doesn't have to redo either. In dev, the
  // `fs.watch` below resets the cache when the SVG changes; in build we
  // never reset.
  const state = cachedPromise(resolveState, { lazy: true });

  // Surface background-work errors so a failing `favicons()` call doesn't
  // become an unhandled rejection if nothing awaits the promise.
  void state.get().catch((err) => {
    console.error("[faviconPlugin] background favicon work failed:", err);
  });

  if (process.env["NODE_ENV"] === "development") {
    void (async () => {
      try {
        for await (const _event of fs.watch(inputFilepath)) {
          state.reset();
          void state.get().catch((err) => {
            console.error(
              "[faviconPlugin] background favicon work failed:",
              err,
            );
          });
        }
      } catch (err) {
        console.warn(
          `[faviconPlugin] watch on ${inputFilepath} aborted:`,
          err,
        );
      }
    })();
  }

  const attachToExpress = (app: Express) => {
    app.use(
      `/${mountPointFragments.join("/")}`,
      async (req, res, next) => {
        const pathFragments = req.path.split("/");

        if (pathFragments.length !== 2 || pathFragments[0] !== "") {
          next();
          return;
        }

        const filename = pathFragments[1]!; // `!` is okay because we checked the length
        const { filesByName } = await state.get();
        const content = filesByName[filename];

        if (content === undefined) {
          next();
          return;
        }

        res.status(200).contentType(filename).end(content);
      },
    );
  };

  const buildPre: PluginBuildPreFunction<FaviconPluginBuildPreResult> = async ({
    baseOutputFolder,
    emitStaticPathname,
  }) => {
    const {
      response: { images, files },
    } = await state.get();
    const cacheBustingMap: Record<string, string> = {};
    const toPathname = (filename: string) =>
      `/${[...mountPointFragments, filename].join("/")}`;

    const outputFolder = path.join(baseOutputFolder, ...mountPointFragments);
    await fs.mkdir(outputFolder, { recursive: true });

    for (const image of images) {
      let realOutputFilename;
      if (cacheBustingFragment === undefined) {
        const fragment = await getCacheBustingFragmentContent(image.contents);
        realOutputFilename = getCacheBustedFilename(image.name, fragment);
      } else if (cacheBustingFragment === false) {
        realOutputFilename = image.name;
      } else {
        realOutputFilename = getCacheBustedFilename(
          image.name,
          cacheBustingFragment,
        );
      }

      cacheBustingMap[image.name] = realOutputFilename;

      const outputFilepath = path.join(outputFolder, realOutputFilename);
      console.debug(`[Favicon Image] /${image.name} -> ${outputFilepath}`);
      await fs.writeFile(outputFilepath, image.contents);
      // Emit the non-cache-busted pathname — that's what `<Link>` hrefs in
      // source actually reference. The cache-busted variant only shows up
      // in injected `<link>` tags, which don't go through the crawler.
      emitStaticPathname(toPathname(image.name));
    }

    for (const file of files) {
      // Replace cache-busted images in files too
      let realContents = file.contents;
      for (const [name, cacheBustedName] of Object.entries(cacheBustingMap)) {
        realContents = realContents.replaceAll(name, cacheBustedName);
      }

      let realOutputFilename;
      if (cacheBustingFragment === undefined) {
        const fragment = await getCacheBustingFragmentContent(realContents);
        realOutputFilename = getCacheBustedFilename(file.name, fragment);
      } else if (cacheBustingFragment === false) {
        realOutputFilename = file.name;
      } else {
        realOutputFilename = getCacheBustedFilename(
          file.name,
          cacheBustingFragment,
        );
      }

      cacheBustingMap[file.name] = realOutputFilename;

      const outputFilepath = path.join(outputFolder, realOutputFilename);
      console.debug(`[Favicon File] /${file.name} -> ${outputFilepath}`);
      await fs.writeFile(outputFilepath, realContents);
      emitStaticPathname(toPathname(file.name));
    }

    return { cacheBustingMap };
  };

  const getInjectable: PluginGetInjectableFunction<
    FaviconPluginBuildPreResult
  > = async (options) => {
    const { response, parsedHtmlDev } = await state.get();
    // Dev: reuse the memoized parsed tag array — stable reference until the
    // SVG source changes and the watcher resets the cache.
    if (!options.isBuild) {
      return parsedHtmlDev;
    }
    // Build: inject the per-build `cacheBustingMap` into every href before
    // parsing. Runs exactly once per build, so memoization isn't worth the
    // indirection.
    const cacheBustingMap = options.buildPreResult.cacheBustingMap;
    return response.html.map((htmlTag) => {
      let cacheBustedHtmlTag = htmlTag;
      for (const [name, cacheBustedName] of Object.entries(cacheBustingMap)) {
        cacheBustedHtmlTag = cacheBustedHtmlTag.replaceAll(
          name,
          cacheBustedName,
        );
      }
      return parseHtmlTag(cacheBustedHtmlTag);
    });
  };

  return () => ({
    attachToExpress,
    buildPre,
    getInjectable,
  });
};
