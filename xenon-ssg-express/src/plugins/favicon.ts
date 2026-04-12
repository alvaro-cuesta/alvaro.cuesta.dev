import type { Express } from "express";
import favicons, { type FaviconOptions } from "favicons";
import type {
  PluginInjectableTag,
  Plugin,
  PluginGetInjectableFunction,
  PluginBuildPreFunction,
} from "./plugins";
import path from "node:path";
import fs from "node:fs/promises";
import {
  getCacheBustedFilename,
  getCacheBustingFragmentContent,
} from "../cache-busting";

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
};

type FaviconPluginBuildPreResult = {
  cacheBustingMap: Record<string, string>;
};

export const faviconPlugin = async ({
  inputFilepath,
  faviconOptions,
  mountPointFragments = [],
  cacheBustingFragment,
}: FaviconPluginOptions): Promise<Plugin<FaviconPluginBuildPreResult>> => {
  // TODO: Some cache/watch would be nice -- this is currently taking several secs on every dev server restart
  const { images, files, html } = await favicons(inputFilepath, faviconOptions);

  const filesByName = {
    ...Object.fromEntries(images.map((image) => [image.name, image.contents])),
    ...Object.fromEntries(files.map((file) => [file.name, file.contents])),
  };

  const attachToExpress = (app: Express) => {
    app.use(`/${mountPointFragments.join("/")}`, (req, res, next) => {
      const pathFragments = req.path.split("/");

      if (pathFragments.length !== 2 || pathFragments[0] !== "") {
        next();
        return;
      }

      const filename = pathFragments[1]!; // `!` is okay because we checked the length
      const content = filesByName[filename];

      if (content === undefined) {
        next();
        return;
      }

      res.status(200).contentType(filename).end(content);
    });
  };

  const buildPre: PluginBuildPreFunction<FaviconPluginBuildPreResult> = async ({
    baseOutputFolder,
    emitStaticPathname,
  }) => {
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
  > = (options) =>
    html.map((htmlTag) => {
      let cacheBustedHtmlTag = htmlTag;
      if (options.isBuild) {
        const cacheBustingMap = options.buildPreResult.cacheBustingMap;

        for (const [name, cacheBustedName] of Object.entries(cacheBustingMap)) {
          cacheBustedHtmlTag = cacheBustedHtmlTag.replaceAll(
            name,
            cacheBustedName,
          );
        }
      }

      return parseHtmlTag(cacheBustedHtmlTag);
    });

  return () => ({
    attachToExpress,
    buildPre,
    getInjectable,
  });
};
