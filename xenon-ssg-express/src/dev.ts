import express, { type Express } from "express";
import { makeXenonMiddleware } from "xenon-ssg/middleware";
import morgan from "morgan";
import {
  type XenonExpressSite,
  DEFAULT_DEV_PORT,
  getSiteMeta,
} from "./index.tsx";
import { getTagsFromInjectableRaw } from "./plugins/plugins.tsx";
import type { UnknownRecord } from "type-fest";

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
  port: number = DEFAULT_DEV_PORT,
): Express {
  const app = express();

  app.use(morgan("dev"));

  const siteMeta = getSiteMeta(port);
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
 * Start a dev server for the site `loadSite` returns.
 *
 * Listens before the site loads: loading a site imports all its modules, which
 * blocks the thread for a while, so `loadSite` only runs once the port is
 * bound. Requests that arrive in the meantime wait for the site instead of
 * failing to connect, and if it fails to load, every request responds with the
 * error.
 */
export async function startXenonExpressDevApp<
  PageMetadata extends UnknownRecord,
>(
  loadSite: () => Promise<XenonExpressSite<PageMetadata>>,
  port: number = DEFAULT_DEV_PORT,
): Promise<Express> {
  const app = express();
  const siteApp = Promise.withResolvers<Express>();
  // Avoid an unhandled rejection: the error is logged below and reported to
  // every request.
  siteApp.promise.catch(() => {});

  app.use(async (req, res, next) => {
    let resolvedSiteApp: Express;
    try {
      resolvedSiteApp = await siteApp.promise;
    } catch (error) {
      next(error);
      return;
    }
    resolvedSiteApp(req, res, next);
  });

  await new Promise<void>((resolve, reject) => {
    app.listen(port, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(`Listening on http://localhost:${port}`);
      resolve();
    });
  });

  try {
    siteApp.resolve(makeXenonDevExpressApp(await loadSite(), port));
  } catch (error) {
    console.error(error);
    siteApp.reject(error);
  }

  return app;
}
