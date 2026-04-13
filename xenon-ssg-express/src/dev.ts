import express, { type Express } from "express";
import { makeXenonMiddleware } from "xenon-ssg/src/middleware";
import morgan from "morgan";
import { type XenonExpressSite, getSiteMeta } from ".";
import { getTagsFromInjectableRaw } from "./plugins/plugins";
import type { UnknownRecord } from "type-fest";

export const DEFAULT_DEV_PORT = 31337;

/**
 * Create an Express app that serves a Xenon site in development mode.
 *
 * Stays **sync**: nothing in dev-time setup is actually blocking — plugin
 * factories and `attachToExpress` all run sync, and the one place that could
 * have been async (gathering `injectableRaw` from plugins' `getInjectable`)
 * is deferred into the per-request render wrapper below.
 *
 * The middleware deliberately does **not** memoize `injectableRaw` across
 * requests. Each render re-calls every plugin's `getInjectable` so a plugin
 * reflecting source-file changes (e.g. favicon's `fs.watch` on the SVG, or a
 * future hot-reloading plugin) can surface updated tags on the very next
 * request. See the contract on `PluginGetInjectableFunction` in
 * `plugins/plugins.tsx` — plugins with expensive init MUST memoize
 * internally and return a stable Promise/array reference between changes.
 * The per-request cost when everything is memoized is sub-millisecond:
 * a microtask tick, an `Array.flat()`, and ~N React element creations for
 * the injected tag list.
 */
export function makeXenonDevExpressApp<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
): Express {
  const app = express();

  app.use(morgan("dev"));

  const siteMeta = getSiteMeta(site);
  const plugins = site.plugins
    .map((plugin) => plugin(siteMeta))
    .filter((x) => x !== undefined);

  // We attach in reverse because middlewares are applied back-to-front and we want this to have the same priority as
  // build mode
  for (const plugin of [...plugins].reverse()) {
    plugin.attachToExpress?.(app);
  }

  const render = async (pathname: string) => {
    const injectableRawArrays = await Promise.all(
      plugins.map(
        async (runnablePlugin) =>
          (await runnablePlugin.getInjectable?.({
            isBuild: false,
            siteMeta,
          })) ?? [],
      ),
    );
    const injectableRaw = injectableRawArrays.flat();
    const { injectable, injectableCritical } =
      getTagsFromInjectableRaw(injectableRaw);
    return site.render({
      ...siteMeta,
      pathname,
      injectableRaw,
      injectable,
      injectableCritical,
    });
  };

  app.use(makeXenonMiddleware(render, site.renderToStreamOptions));

  return app;
}

/**
 * Convenience function if you just want to quickly start a dev server.
 */
export function startXenonExpressDevApp<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
): Express {
  const app = makeXenonDevExpressApp(site);
  const port = site.devPort ?? DEFAULT_DEV_PORT;

  app.listen(port, "127.0.0.1", () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  return app;
}
