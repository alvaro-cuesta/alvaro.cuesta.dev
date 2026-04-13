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

    const compileCss = async (sourceCode: Buffer): Promise<Buffer> => {
      const { code: outputCode, warnings } = transform({
        filename: path.basename(inputFilepath),
        code: sourceCode,
        minify: true,
        sourceMap: false,
      });

      if (warnings.length > 0) {
        console.warn(warnings);
      }

      return Buffer.from(outputCode);
    };

    const attachToExpress: PluginAttachToExpressFunction = (app) => {
      app.get(pathname, async (req, res) => {
        // Weak ETag from `size + mtime`, matching the `express.static`
        // convention. A single `fs.stat` (~0.05 ms regardless of file
        // size) lets us short-circuit before touching the source file at
        // all on a fresh client request. lightningcss's `transform` is
        // pure source-to-source (it does NOT inline `@import` — that's
        // `bundle` / `bundleAsync`, which we don't use), so the one input
        // file is the only thing that affects the output.
        const stat = await fs.stat(inputFilepath);
        const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
        res.setHeader("ETag", etag);
        res.contentType("css");
        if (req.fresh) {
          res.status(304).end();
          return;
        }
        const sourceCode = await fs.readFile(inputFilepath);
        const code = await compileCss(sourceCode);
        res.status(200).end(code);
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

      const sourceCode = await fs.readFile(inputFilepath);
      const code = await compileCss(sourceCode);

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
