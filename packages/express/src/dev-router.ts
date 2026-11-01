import express, { type Router } from "express";
import type { XenonExpressSite, XenonExpressSiteMeta } from "./index.tsx";
import { makeXenonMiddleware } from "./middleware.ts";
import { getTagsFromInjectableRaw } from "./plugin.tsx";
import type { UnknownRecord } from "type-fest";

/**
 * Create an Express router that serves a Xenon site in development mode:
 * plugins' routes, then a page for any other request.
 *
 * Mount it where the site's root is served (e.g. `app.use("/repo", router)`):
 * it handles site paths, relative to wherever it's mounted. `siteMeta` is
 * where the site is publicly served (see `makeSiteMeta`), only for the URLs it
 * writes. They're usually the same, but not behind a proxy that strips the
 * base path, where the router is mounted at the root.
 *
 * Stays **sync**: nothing in dev-time setup is actually blocking — plugin
 * factories and `attachToExpress` all run sync, and the one place that could
 * have been async (gathering `injectableRaw` from plugins' `getInjectable`)
 * is deferred into the per-request render wrapper below.
 *
 * The middleware deliberately does **not** memoize `injectableRaw` across
 * requests. Each render re-calls every plugin's `getInjectable` so a plugin
 * reflecting source-file changes (e.g. favicon's `inputFile` thunk) can
 * surface updated tags on the very next request. See the contract on
 * `PluginGetInjectableFunction` in `plugin.tsx` — plugins with expensive init
 * MUST memoize internally and return a stable Promise/array reference between
 * changes. The per-request cost when everything is memoized is
 * sub-millisecond: a microtask tick, an `Array.flat()`, and ~N React element
 * creations for the injected tag list.
 *
 * Logs nothing: that's up to whoever owns the server, which may serve more
 * than one site.
 */
export function makeXenonDevRouter<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
  siteMeta: XenonExpressSiteMeta,
): Router {
  const router = express.Router();

  const plugins = site.plugins
    .map((plugin) => plugin(siteMeta))
    .filter((x) => x !== undefined);

  // We attach in reverse because middlewares are applied back-to-front and we want this to have the same priority as
  // build mode
  for (const plugin of [...plugins].reverse()) {
    plugin.attachToExpress?.(router);
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
    const { injectable, injectableCritical } = getTagsFromInjectableRaw(
      injectableRaw,
      siteMeta.basepath,
    );
    return site.render({
      ...siteMeta,
      pathname,
      injectableRaw,
      injectable,
      injectableCritical,
    });
  };

  router.use(
    makeXenonMiddleware(render, {
      basepath: siteMeta.basepath,
      renderToStreamOptions: site.renderToStreamOptions,
    }),
  );

  return router;
}
