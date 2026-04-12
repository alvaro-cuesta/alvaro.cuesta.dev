import fs from "node:fs/promises";
import path from "node:path";
import { generateStaticSite } from "xenon-ssg/src/generate/generate";
import { type XenonExpressSite, getSiteMeta } from ".";
import { getTagsFromInjectableRaw, type Plugin } from "./plugins/plugins";
import type { UnknownRecord } from "type-fest";

type BuildXenonSiteOptions = {
  outputDir?: string;
  entryPaths?: Iterable<string>;
};

/**
 * Builds a Xenon site.
 */
export async function buildXenonExpressSite<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata, Plugin<unknown, PageMetadata>[]>,
  {
    outputDir = path.join(process.cwd(), "dist"),
    entryPaths = ["/"],
  }: BuildXenonSiteOptions = {},
) {
  await fs.rm(outputDir, {
    recursive: true,
    force: true,
  });

  const siteMeta = getSiteMeta(site);
  const plugins = site.plugins
    .map((plugin) => plugin(siteMeta))
    .filter((x) => x !== undefined);

  console.debug("Running plugins (pre):");

  const buildPreResults: unknown[] = [];
  const ignoredPathnames: string[] = [];
  const emitStaticPathname = (pathname: string) => {
    ignoredPathnames.push(pathname);
  };

  const injectableRaws = await Promise.all(
    plugins.map(async (runnablePlugin, pluginIndex) => {
      const buildPreResult = await runnablePlugin.buildPre?.({
        siteMeta,
        baseOutputFolder: outputDir,
        emitStaticPathname,
      });

      buildPreResults[pluginIndex] = buildPreResult;

      return (
        runnablePlugin.getInjectable?.({
          isBuild: true,
          siteMeta,
          baseOutputFolder: outputDir,
          buildPreResult,
        }) ?? []
      );
    }),
  );

  const injectableRaw = injectableRaws.flat();

  const { injectable, injectableCritical } =
    getTagsFromInjectableRaw(injectableRaw);

  console.debug("\nGenerating static site:");

  const render = (pathname: string) =>
    site.render({
      ...siteMeta,
      pathname,
      injectableRaw,
      injectable,
      injectableCritical,
    });

  const generatedPages = await generateStaticSite(render, {
    entryPaths: entryPaths,
    outputDir: outputDir,
    renderToStreamOptions: site.renderToStreamOptions,
    ignoredPathnames,
  });

  console.debug("\nRunning plugins (post):");

  for (const [pluginIndex, plugin] of plugins.entries()) {
    await plugin.buildPost?.({
      buildPreResult: buildPreResults[pluginIndex],
      siteMeta,
      baseOutputFolder: outputDir,
      generatedPages,
    });
  }

  console.log("\nAll done!");
}
