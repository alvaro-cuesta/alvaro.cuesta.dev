import type { AddressInfo } from "node:net";
import express, { type Express } from "express";
import morgan from "morgan";
import { makeXenonMiddleware } from "./middleware.ts";
import {
  type XenonExpressSite,
  type XenonExpressSiteMeta,
  makeSiteMeta,
} from "./index.tsx";
import { getTagsFromInjectableRaw } from "./plugin.tsx";
import type { UnknownRecord } from "type-fest";

const DEFAULT_DEV_PORT = 31337;

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
 *
 * `siteMeta` is where the app is served (see `makeSiteMeta`), so the site's
 * absolute URLs point at it. The app serves its origin, with the site at its
 * base path, as a static host would serve the build.
 */
export function makeXenonDevExpressApp<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
  siteMeta: XenonExpressSiteMeta,
): Express {
  const app = express();

  app.use(morgan("dev"));

  // Mounted at the base path, so plugins' routes and the pages' pathnames are
  // site paths, as in the build.
  const siteApp = express();
  app.use(siteMeta.basepath || "/", siteApp);

  const plugins = site.plugins
    .map((plugin) => plugin(siteMeta))
    .filter((x) => x !== undefined);

  // We attach in reverse because middlewares are applied back-to-front and we want this to have the same priority as
  // build mode
  for (const plugin of [...plugins].reverse()) {
    plugin.attachToExpress?.(siteApp);
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

  siteApp.use(
    makeXenonMiddleware(render, {
      basepath: siteMeta.basepath,
      renderToStreamOptions: site.renderToStreamOptions,
    }),
  );

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
 *
 * Serves the site at `basepath`, if given (e.g. `/repo`), to try it where a
 * build for it would be deployed.
 */
export async function startXenonExpressDevApp<
  PageMetadata extends UnknownRecord,
>(
  loadSite: () => Promise<XenonExpressSite<PageMetadata>>,
  port: number = DEFAULT_DEV_PORT,
  basepath: string = "",
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

  const origin = await new Promise<string>((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }
      // The port it's bound to, which isn't `port` when that's 0.
      const { port: boundPort } = server.address() as AddressInfo;
      resolve(`http://localhost:${boundPort}`);
    });
  });
  const siteMeta = makeSiteMeta(origin, basepath);
  console.log(`Listening on ${siteMeta.baseUrl}/`);

  try {
    siteApp.resolve(makeXenonDevExpressApp(await loadSite(), siteMeta));
  } catch (error) {
    console.error(error);
    siteApp.reject(error);
  }

  return app;
}
