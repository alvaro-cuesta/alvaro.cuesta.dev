import type { AddressInfo } from "node:net";
import express, { type Express, type Router } from "express";
import morgan from "morgan";
import { type XenonExpressSite, makeSiteMeta } from "./index.tsx";
import { makeXenonDevRouter } from "./dev-router.ts";
import type { UnknownRecord } from "type-fest";

const DEFAULT_DEV_PORT = 31337;

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
 *
 * To serve it from a server of your own instead (e.g. with other sites, or
 * behind a proxy), see `makeXenonDevRouter`.
 */
export async function startXenonExpressDevApp<
  PageMetadata extends UnknownRecord,
>(
  loadSite: () => Promise<XenonExpressSite<PageMetadata>>,
  port: number = DEFAULT_DEV_PORT,
  basepath: string = "",
): Promise<Express> {
  const app = express();
  const siteRouter = Promise.withResolvers<Router>();
  // Avoid an unhandled rejection: the error is logged below and reported to
  // every request.
  siteRouter.promise.catch(() => {});

  app.use(morgan("dev"));

  // At the base path, where the site's root is.
  app.use(basepath || "/", async (req, res, next) => {
    let resolvedSiteRouter: Router;
    try {
      resolvedSiteRouter = await siteRouter.promise;
    } catch (error) {
      next(error);
      return;
    }
    resolvedSiteRouter(req, res, next);
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
    siteRouter.resolve(makeXenonDevRouter(await loadSite(), siteMeta));
  } catch (error) {
    console.error(error);
    siteRouter.reject(error);
  }

  return app;
}
