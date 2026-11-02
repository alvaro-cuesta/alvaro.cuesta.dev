import fs from "node:fs/promises";
import path from "node:path";
import { generateStaticSite } from "@xenon-ssg/core/generate/generate";
import { createXenonCache } from "./cache.ts";
import { type XenonExpressSiteModule, makeSiteMeta } from "./index.tsx";
import { getTagsFromInjectableRaw, type PluginStaticFile } from "./plugin.tsx";
import type { UnknownRecord } from "type-fest";

type BuildXenonSiteOptions = {
  /**
   * Where the build will be deployed, for its absolute URLs (see
   * `makeSiteMeta`). No default: a build made for the wrong one still works,
   * until its links point elsewhere.
   */
  origin: string;
  /**
   * Where in `origin` the build will be deployed, if not at its root (e.g.
   * `/repo`). Only the URLs in it change: `outputDir` is what's deployed there.
   */
  basepath?: string | undefined;
  outputDir?: string;
  entryPaths?: Iterable<string>;
};

/**
 * Builds the site the module `loadSite` imports makes with its `makeSite`
 * export (see `XenonExpressSiteModule`), like `startXenonExpressDevApp` serves
 * it.
 */
export async function buildXenonExpressSite<PageMetadata extends UnknownRecord>(
  loadSite: () => Promise<XenonExpressSiteModule<PageMetadata>>,
  {
    origin,
    basepath,
    outputDir = path.join(process.cwd(), "dist"),
    entryPaths = ["/"],
  }: BuildXenonSiteOptions,
): Promise<void> {
  const { makeSite } = await loadSite();
  const site = makeSite();

  await fs.rm(outputDir, {
    recursive: true,
    force: true,
  });

  const siteMeta = makeSiteMeta(origin, basepath);
  const cache =
    site.callerUrl === undefined
      ? undefined
      : await createXenonCache({ callerUrl: site.callerUrl });
  const plugins = site.plugins
    .map((plugin) => plugin(siteMeta, { cache }))
    .filter((x) => x !== undefined);

  console.debug("Running plugins (pre):");

  const buildPreResults: unknown[] = [];

  const buildPreOutputs = await Promise.all(
    plugins.map(async (runnablePlugin, pluginIndex) => {
      // Per plugin, as their `buildPre`s run at once: `staticFiles` keeps the
      // plugins' order.
      const pluginStaticFiles: PluginStaticFile<PageMetadata>[] = [];

      const buildPreResult = await runnablePlugin.buildPre?.({
        siteMeta,
        baseOutputFolder: outputDir,
        emitStaticPathname: (pathname, metadata) => {
          pluginStaticFiles.push({ pathname, metadata });
        },
      });

      buildPreResults[pluginIndex] = buildPreResult;

      const injectableRaw =
        (await runnablePlugin.getInjectable?.({
          isBuild: true,
          siteMeta,
          baseOutputFolder: outputDir,
          buildPreResult,
        })) ?? [];

      return { injectableRaw, staticFiles: pluginStaticFiles };
    }),
  );

  const injectableRaw = buildPreOutputs.flatMap(
    (output) => output.injectableRaw,
  );
  const staticFiles = buildPreOutputs.flatMap((output) => output.staticFiles);

  const { injectable, injectableCritical } = getTagsFromInjectableRaw(
    injectableRaw,
    siteMeta.basepath,
  );

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
    basepath: siteMeta.basepath,
    renderToStreamOptions: site.renderToStreamOptions,
    ignoredPathnames: staticFiles.map((staticFile) => staticFile.pathname),
  });

  console.debug("\nRunning plugins (post):");

  for (const [pluginIndex, plugin] of plugins.entries()) {
    await plugin.buildPost?.({
      buildPreResult: buildPreResults[pluginIndex],
      siteMeta,
      baseOutputFolder: outputDir,
      generatedPages,
      staticFiles,
    });
  }

  console.log("\nAll done!");
}
