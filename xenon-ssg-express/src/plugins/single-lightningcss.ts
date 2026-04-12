import { transform } from "lightningcss";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  Plugin,
  PluginAttachToExpressFunction,
  PluginBuildPreFunction,
  PluginGetInjectableFunction,
} from "./plugins";
import {
  getCacheBustedFilename,
  getCacheBustingFragmentContent,
} from "../cache-busting";

type SingleLightningCssPluginOptions = {
  inputFilepath: string;
  outputFilename: string;
  mountPointFragments?: string[];
  /**
   * - `string` to manually control fragment
   * - `false` to disable cache busting
   * - `undefined` to calculate from input file hash
   */
  cacheBustingFragment?: string | false | undefined;
  critical?: boolean;
};

type SingleLightningCssPluginBuildPreResult = { cacheBustedPathname: string };

export const singleLightningCssPlugin =
  ({
    inputFilepath,
    outputFilename,
    mountPointFragments = [],
    cacheBustingFragment,
    critical,
  }: SingleLightningCssPluginOptions): Plugin<SingleLightningCssPluginBuildPreResult> =>
  () => {
    const pathname = `/${[...mountPointFragments, outputFilename].join("/")}`;

    // TODO: Some cache/watch would be nice
    // TODO: This is currently never 304 unlike express.static
    const compileCss = async () => {
      const code = await fs.readFile(path.join(inputFilepath));

      let { code: outputCode, warnings } = transform({
        filename: "index.css",
        code,
        minify: true,
        sourceMap: false,
      });

      if (warnings.length > 0) {
        console.warn(warnings);
      }

      return outputCode;
    };

    const attachToExpress: PluginAttachToExpressFunction = (app) => {
      app.get(pathname, async (_req, res) => {
        const code = await compileCss();
        res.status(200).contentType("css").end(code);
      });
    };

    const buildPre: PluginBuildPreFunction<
      SingleLightningCssPluginBuildPreResult
    > = async ({ baseOutputFolder, emitStaticPathname }) => {
      // Emit the non-cache-busted pathname — that's what `<Link>` hrefs in
      // source actually reference. The cache-busted variant only shows up
      // in injected `<link>` tags, which don't go through the crawler.
      emitStaticPathname(pathname);

      console.debug(`[Single Lightning CSS] ${inputFilepath}`);

      const outputFolder = path.join(baseOutputFolder, ...mountPointFragments);
      await fs.mkdir(outputFolder, { recursive: true });

      const code = await compileCss();

      let realOutputFilename;
      if (cacheBustingFragment === undefined) {
        const fragment = await getCacheBustingFragmentContent(code);
        realOutputFilename = getCacheBustedFilename(outputFilename, fragment);
      } else if (cacheBustingFragment === false) {
        realOutputFilename = outputFilename;
      } else {
        realOutputFilename = getCacheBustedFilename(
          outputFilename,
          cacheBustingFragment,
        );
      }
      const outputFilepath = path.join(outputFolder, realOutputFilename);

      console.debug(
        `[Single Lightning CSS] ${inputFilepath} -> ${outputFilepath}`,
      );
      await fs.writeFile(outputFilepath, code);

      return {
        cacheBustedPathname: `/${[...mountPointFragments, realOutputFilename].join("/")}`,
      };
    };

    const getInjectable:
      | PluginGetInjectableFunction<SingleLightningCssPluginBuildPreResult>
      | undefined = (options) => [
      {
        tagType: "stylesheet" as const,
        href: options.isBuild
          ? options.buildPreResult.cacheBustedPathname
          : pathname,
        critical,
      },
    ];

    return {
      attachToExpress,
      buildPre,
      getInjectable,
    };
  };
