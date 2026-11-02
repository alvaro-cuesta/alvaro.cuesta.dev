import favicons, {
  type FaviconFile,
  type FaviconHtmlTag,
  type FaviconImage,
  type FaviconOptions,
  type FaviconResponse,
} from "favicons";
import type { XenonExpressSiteMeta } from "@xenon-ssg/express";
import type {
  PluginInjectableLink,
  PluginInjectableMeta,
  PluginInjectableTag,
  Plugin,
  PluginAttachToExpressFunction,
  PluginContext,
  PluginGetInjectableFunction,
  PluginBuildPreFunction,
} from "@xenon-ssg/express/plugin";
import crypto from "node:crypto";
import { findPackageJSON } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import { derived, read, thunk, type Thunk } from "@xenon-ssg/thunks";
import {
  getCacheBustedFilename,
  getCacheBustingFragmentContent,
} from "@xenon-ssg/express/cache-busting";
import type { XenonCache } from "@xenon-ssg/express/cache";
import { toServedHref } from "@xenon-ssg/core/url";
import { assertNever } from "@xenon-ssg/core/assert";

/**
 * The attributes of a tag `favicons` gives, of those named.
 *
 * Throws on any other attribute, or a bare one (`true`): the injected tag
 * couldn't carry it, and leaving it out would change what the tag does.
 */
const getAttributes = <const Name extends string>(
  htmlTag: FaviconHtmlTag,
  names: readonly Name[],
): Partial<Record<Name, string>> => {
  const isNamed = (name: string): name is Name =>
    (names as readonly string[]).includes(name);

  const attributes: Partial<Record<Name, string>> = {};
  for (const [name, value] of Object.entries(htmlTag.attrs)) {
    // `false` is how `favicons` leaves one out (its own HTML skips it), e.g. the
    // manifest link's `crossOrigin` without credentials. Not the string "false".
    if (value === false || value === undefined) continue;

    if (!isNamed(name) || value === true) {
      throw new Error(
        `Unsupported attribute \`${name}\` in ${JSON.stringify(htmlTag)}`,
      );
    }

    attributes[name] = value;
  }
  return attributes;
};

/** The tags `favicons` gives, as injectable tags. */
type FaviconInjectableTag = PluginInjectableLink | PluginInjectableMeta;

/**
 * The tag `favicons` gives, or `undefined` for a meta tag without content,
 * which would say nothing.
 */
const toInjectableTag = (
  htmlTag: FaviconHtmlTag,
): FaviconInjectableTag | undefined => {
  switch (htmlTag.tag) {
    case "link": {
      // What `PluginInjectableLink` carries.
      const { rel, type, title, sizes, media, crossOrigin, href } =
        getAttributes(htmlTag, [
          "rel",
          "type",
          "title",
          "sizes",
          "media",
          "crossOrigin",
          "href",
        ]);

      if (rel === undefined || href === undefined) {
        throw new Error(
          `Link without \`rel\` or \`href\`: ${JSON.stringify(htmlTag)}`,
        );
      }

      // The values `PluginInjectableLink` takes.
      if (
        crossOrigin !== undefined &&
        crossOrigin !== "anonymous" &&
        crossOrigin !== "use-credentials"
      ) {
        throw new Error(
          `Unsupported \`crossOrigin\` in ${JSON.stringify(htmlTag)}`,
        );
      }

      return {
        tagType: "link",
        rel,
        type,
        title,
        sizes,
        media,
        crossOrigin,
        href,
      };
    }

    case "meta": {
      const { name, content } = getAttributes(htmlTag, ["name", "content"]);

      if (name === undefined) {
        throw new Error(
          `Meta tag without \`name\`: ${JSON.stringify(htmlTag)}`,
        );
      }

      // `favicons` leaves `content` out when there's nothing to put in it, e.g.
      // `application-name` without an `appName`.
      if (content === undefined || content === "") return undefined;

      return {
        tagType: "meta",
        name,
        content,
      };
    }

    default:
      throw new Error(`Unsupported tag in ${JSON.stringify(htmlTag)}`);
  }
};

/**
 * Serves the site paths `favicons` writes in some meta tags' content (e.g.
 * `msapplication-config`) at the base path. Unlike `href`s, which the host
 * serves for every plugin, it can't know a meta tag's content is a URL.
 */
const serveMetaContents = (
  tags: PluginInjectableTag[],
  basepath: string,
): PluginInjectableTag[] =>
  tags.map((tag) =>
    tag.tagType === "meta"
      ? { ...tag, content: toServedHref(tag.content, basepath) }
      : tag,
  );

type FaviconPluginOptions = {
  /**
   * The SVG's path. Read once if it's a `string`.
   *
   * A thunk to have the favicons follow edits to the file, however the site
   * finds out about them (e.g. a watcher that invalidates a `cell`): each new
   * value it gives means the file may have changed, even if the path is the
   * same, and the favicons are made again from it. The plugin only reads it:
   * whoever made it disposes it.
   */
  inputFile: string | Thunk<string>;
  /**
   * `start_url` and `scope` are site paths (e.g. `/`), or absolute URLs. The
   * paths in the files are up to the plugin, so they work wherever the site is
   * served (see `toFaviconOptions`).
   */
  faviconOptions: Omit<
    FaviconOptions,
    "cacheBustingQueryParam" | "path" | "manifestRelativePaths"
  >;
  mountPointFragments?: string[];
  /**
   * - `string` to manually control fragment
   * - `false` to disable cache busting
   * - `undefined` to calculate from input file hash
   */
  cacheBustingFragment?: string | false | undefined;
};

// `favicons`' own default, which is a site path too.
const DEFAULT_START_URL = "/?homescreen=1";

/**
 * The options for `favicons`, so that what it makes works wherever the site is
 * served, without knowing where: the files it makes (e.g. the web app
 * manifest) have relative URLs, which browsers resolve against the file, and
 * its tags have site paths, which are served at the base path like any other
 * injected tag's.
 */
const toFaviconOptions = (
  faviconOptions: FaviconPluginOptions["faviconOptions"],
  mountPointFragments: string[],
): FaviconOptions => {
  // From the folder the files are in to the site's root.
  const toRoot = "../".repeat(mountPointFragments.length) || "./";
  const relativeFromFiles = (href: string) =>
    href.startsWith("/") && !href.startsWith("//")
      ? `${toRoot}${href.slice(1)}`
      : href;

  return {
    ...faviconOptions,
    path: `/${mountPointFragments.join("/")}`,
    manifestRelativePaths: true,
    start_url: relativeFromFiles(faviconOptions.start_url ?? DEFAULT_START_URL),
    ...(faviconOptions.scope !== undefined
      ? { scope: relativeFromFiles(faviconOptions.scope) }
      : {}),
  };
};

type FaviconPluginBuildPreResult = {
  cacheBustingMap: Record<string, string>;
};

// The parts of favicons' response the plugin uses. Only those are cached, so a
// cached response has fewer than favicons gives.
type UsedFaviconResponse = Pick<
  FaviconResponse,
  "images" | "files" | "htmlTags"
>;

type CachedFaviconResponse = {
  images: { name: string; contents: string /* base64 */ }[];
  files: { name: string; contents: string }[];
  htmlTags: FaviconHtmlTag[];
};

const serializeFaviconResponse = (response: UsedFaviconResponse): string => {
  const serializable: CachedFaviconResponse = {
    images: response.images.map((img) => ({
      name: img.name,
      contents: img.contents.toString("base64"),
    })),
    files: response.files.map((file) => ({
      name: file.name,
      contents: file.contents,
    })),
    htmlTags: [...response.htmlTags],
  };
  return JSON.stringify(serializable);
};

const deserializeFaviconResponse = (raw: Buffer): UsedFaviconResponse => {
  const cached = JSON.parse(raw.toString("utf-8")) as CachedFaviconResponse;
  const images: FaviconImage[] = cached.images.map((img) => ({
    name: img.name,
    contents: Buffer.from(img.contents, "base64"),
  }));
  const files: FaviconFile[] = cached.files.map((file) => ({
    name: file.name,
    contents: file.contents,
  }));
  return { images, files, htmlTags: cached.htmlTags };
};

// Part of the cache key: another version of `favicons` can make other favicons
// from the same SVG and options. Found through Node, as `favicons` doesn't
// export its `package.json`.
const FAVICONS_VERSION = (
  JSON.parse(
    await fs.readFile(findPackageJSON("favicons", import.meta.url)!, "utf-8"), // `!` is fine because `favicons` is imported above
  ) as { version: string }
).version;

// Part of the cache key too: bump it when `CachedFaviconResponse` changes, so
// entries in its older shape aren't read as the new one.
const CACHED_RESPONSE_VERSION = 2;

const getFaviconCacheKey = (
  svgContents: Buffer,
  faviconOptions: FaviconOptions,
): string => {
  const payload = Buffer.concat([
    Buffer.from(String(CACHED_RESPONSE_VERSION)),
    Buffer.from("\0"),
    Buffer.from(FAVICONS_VERSION),
    Buffer.from("\0"),
    svgContents,
    Buffer.from("\0"),
    Buffer.from(JSON.stringify(faviconOptions)),
  ]);
  return crypto.createHash("sha256").update(payload).digest("hex");
};

type FaviconDerivedState = {
  response: UsedFaviconResponse;
  /** Merged images + files lookup, precomputed once per version of the SVG. */
  filesByName: Record<string, Buffer | string>;
  /** The tags to inject, with the files' names before the build's cache
   * busting. */
  tags: FaviconInjectableTag[];
};

/**
 * Generates favicons, and the tags that link to them, from one SVG.
 *
 * Making them is slow, so it keeps them in the host's cache, if it has one
 * (see `PluginContext`), keyed by the SVG's contents, the options and the
 * version of `favicons`: later runs, and restarts, reuse them.
 *
 * Disposing it lets go of the favicons it keeps in memory (see
 * `@xenon-ssg/thunks`), but not of a thunk it's given as `inputFile`, nor of
 * what's in the cache.
 */
export const faviconPlugin = ({
  inputFile,
  faviconOptions,
  mountPointFragments = [],
  cacheBustingFragment,
}: FaviconPluginOptions): Plugin<FaviconPluginBuildPreResult> & Disposable => {
  // From its runs, as only the host knows where it is. Every run in a process
  // gets the same one, and the favicons are only made once something runs, so
  // it's there by then.
  let cache: XenonCache | undefined;
  // The path's thunk, if it's made here from a `string`: a thunk the plugin is
  // given is whoever made it's to dispose.
  const ownedByState = new DisposableStack();
  const svgPath =
    typeof inputFile === "string"
      ? ownedByState.use(thunk(async () => inputFile))
      : inputFile;
  // Also what the cache is keyed by, so it never gives favicons made with
  // other options, e.g. by an older version of this plugin.
  const resolvedFaviconOptions = toFaviconOptions(
    faviconOptions,
    mountPointFragments,
  );

  // `favicons()` and everything made from its response, so `getInjectable`,
  // the request handler and `buildPre` share them. They're made when something
  // reads them, not when the SVG changes: a save can fire several change
  // events, and the first may come while it's still being written, but they
  // only give the path again, and the next read reads the file and makes the
  // favicons once. Both the cache key and the favicons are made from that one
  // read, so they always come from the same version of the SVG.
  const state = derived(async (get): Promise<FaviconDerivedState> => {
    const svgContents = await fs.readFile(await get(svgPath));
    const ns = cache?.namespace("favicon") ?? null;
    const cacheKey = ns
      ? `${getFaviconCacheKey(svgContents, resolvedFaviconOptions)}.json`
      : null;

    let response: UsedFaviconResponse | null = null;
    if (ns && cacheKey) {
      const cached = await ns.get(cacheKey);
      if (cached !== null) {
        response = deserializeFaviconResponse(cached);
      }
    }
    if (response === null) {
      response = await favicons(svgContents, resolvedFaviconOptions);
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
    const tags = response.htmlTags
      .map(toInjectableTag)
      .filter((tag) => tag !== undefined);
    return { response, filesByName, tags };
  }, ownedByState);

  const attachToExpress: PluginAttachToExpressFunction = (router) => {
    router.use(
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
    const { tags } = await read(state);
    const { basepath } = options.siteMeta;
    // Dev: the tags as made, until the SVG changes. Only its meta contents are
    // served, which is cheap.
    if (!options.isBuild) {
      return serveMetaContents(tags, basepath);
    }
    // Build: the files' cache-busted names, in the only attributes that hold
    // URLs. Runs exactly once per build, so memoization isn't worth the
    // indirection.
    const cacheBustingMap = options.buildPreResult.cacheBustingMap;
    const cacheBust = (url: string) => {
      let cacheBustedUrl = url;
      for (const [name, cacheBustedName] of Object.entries(cacheBustingMap)) {
        cacheBustedUrl = cacheBustedUrl.replaceAll(name, cacheBustedName);
      }
      return cacheBustedUrl;
    };
    return serveMetaContents(
      tags.map((tag) => {
        switch (tag.tagType) {
          case "link":
            return { ...tag, href: cacheBust(tag.href) };
          case "meta":
            return { ...tag, content: cacheBust(tag.content) };
          default:
            return assertNever(tag);
        }
      }),
      basepath,
    );
  };

  return Object.assign(
    (_siteMeta: XenonExpressSiteMeta, context: PluginContext) => {
      cache = context.cache;
      return {
        attachToExpress,
        buildPre,
        getInjectable,
      };
    },
    { [Symbol.dispose]: () => state[Symbol.dispose]() },
  );
};
