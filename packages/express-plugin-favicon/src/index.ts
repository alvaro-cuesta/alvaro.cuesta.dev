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
} from "@xenon-ssg/express/plugin";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { cell, derived, read } from "@xenon-ssg/thunks";
import { watchInDev } from "@xenon-ssg/core/watch";
import {
  getCacheBustedFilename,
  getCacheBustingFragmentContent,
} from "@xenon-ssg/express/cache-busting";
import type { XenonCache } from "@xenon-ssg/express/cache";

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
   * `<siteRoot>/node_modules/.cache/@xenon-ssg/express/favicon/`, keyed by a
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

const getFaviconCacheKey = (
  svgContents: Buffer,
  faviconOptions: FaviconPluginOptions["faviconOptions"],
): string => {
  const payload = Buffer.concat([
    svgContents,
    Buffer.from("\0"),
    Buffer.from(JSON.stringify(faviconOptions)),
  ]);
  return crypto.createHash("sha256").update(payload).digest("hex");
};

type FaviconDerivedState = {
  response: FaviconResponse;
  /** Merged images + files lookup, precomputed once per version of the SVG. */
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
  // The SVG's bytes. Both the cache key and the favicons are made from them, so
  // they always come from the same version of the file.
  const svg = cell(
    () => fs.readFile(inputFilepath),
    (invalidate) => watchInDev(inputFilepath, invalidate),
  );

  // `favicons()` and everything made from its response, so `getInjectable`,
  // the request handler and `buildPre` share them. They're made when something
  // reads them, not when the SVG changes: a save can fire several change
  // events, and the first may come while it's still being written, but they
  // only invalidate the bytes, and the next read makes the favicons once.
  const state = derived(async (get): Promise<FaviconDerivedState> => {
    const svgContents = await get(svg);
    const ns = cache?.namespace("favicon") ?? null;
    const cacheKey = ns
      ? `${getFaviconCacheKey(svgContents, faviconOptions)}.json`
      : null;

    let response: FaviconResponse | null = null;
    if (ns && cacheKey) {
      const cached = await ns.get(cacheKey);
      if (cached !== null) {
        response = deserializeFaviconResponse(cached);
      }
    }
    if (response === null) {
      response = await favicons(svgContents, faviconOptions);
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
  });

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
        const { filesByName } = await read(state);
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
    } = await read(state);
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
    const { response, parsedHtmlDev } = await read(state);
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
