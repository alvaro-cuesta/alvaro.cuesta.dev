import type { AddressInfo } from "node:net";
import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
import morgan from "morgan";
import { hotImport } from "@xenon-ssg/hot-reload";
import { dumpModuleGraph, watchForReload } from "@xenon-ssg/hot-reload/reload";
import type { UnknownRecord } from "type-fest";
import { createXenonCache, type XenonCache } from "./cache.ts";
import {
  type XenonExpressSiteMeta,
  type XenonExpressSiteModule,
  makeSiteMeta,
} from "./index.tsx";

// Where the dev server tells what hot reload knows of the modules, to debug
// it. At the origin's root, not under the base path, so a site can't take it.
const MODULE_GRAPH_PATH = "/_xenon/hot-reload";

/** A version of the site, from when it starts loading. */
type SiteVersion = {
  router: Promise<Router>;
  /** Aborts its renders, once a newer version replaces it. */
  controller: AbortController;
};

/**
 * The dev server `startXenonExpressDevApp` supervises, for the site in the
 * module `loadSite` imports. See it for what it does.
 */
export async function serveXenonExpressSite<PageMetadata extends UnknownRecord>(
  loadSite: () => Promise<XenonExpressSiteModule<PageMetadata>>,
  port: number,
  basepath: string,
): Promise<void> {
  const site = hotImport(loadSite);
  // A hot import, like the site, so it shares the site's imports (e.g. React
  // contexts), and reloads with it.
  const devRouter = hotImport(() => import("./dev-router.ts"));

  // Where it listens, once it does: a load waits for it, as the port it's
  // bound to isn't `port` when that's 0.
  const served = Promise.withResolvers<XenonExpressSiteMeta>();

  // The plugins' cache, for every version of the site that says where it is
  // (see `XenonExpressSite`): made again only if a version moves it, as what's
  // in it doesn't depend on the version (plugins key it by what they make
  // from).
  let cacheUrl: string | undefined;
  let cache: Promise<XenonCache | undefined> = Promise.resolve(undefined);

  const load = async (signal: AbortSignal) => {
    // Only imports the site once it listens: that blocks the thread for a
    // while, and requests can wait for it then instead of failing to connect.
    const siteMeta = await served.promise;
    const [{ makeXenonDevRouter }, { makeSite }] = await Promise.all([
      devRouter.load(),
      site.load(),
    ]);
    const xenonSite = makeSite();
    if (xenonSite.callerUrl !== cacheUrl) {
      cacheUrl = xenonSite.callerUrl;
      cache =
        cacheUrl === undefined
          ? Promise.resolve(undefined)
          : createXenonCache({ callerUrl: cacheUrl });
    }
    return makeXenonDevRouter(xenonSite, siteMeta, {
      signal,
      cache: await cache,
    });
  };

  const loadVersion = (reason: string | undefined): SiteVersion => {
    const start = performance.now();
    const controller = new AbortController();
    const router = load(controller.signal);
    router.then(
      () => {
        if (reason !== undefined) {
          console.log(
            `Reloaded in ${Math.round(performance.now() - start)} ms: ${reason}`,
          );
        }
      },
      // Also reported to every request.
      (error: unknown) => console.error(error),
    );
    return { router, controller };
  };

  // Requests that arrive before the first load is done wait for it.
  let current = loadVersion(undefined);

  const reload = (reason: string) => {
    const previous = current;
    current = loadVersion(reason);

    // Once this one has loaded, or failed to, so its requests can be served
    // again with this one (see `serve`).
    const abortPrevious = () =>
      previous.controller.abort(
        new Error("Replaced by a newer version of the site"),
      );
    current.router.then(abortPrevious, abortPrevious);
  };

  // Every request being served, until the version serving it is done with
  // it: what a change replaced is only disposed once what was being served
  // then is done.
  const serving = new Set<Promise<void>>();

  const serve = async (
    version: SiteVersion,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const done = Promise.withResolvers<void>();
    serving.add(done.promise);
    void done.promise.then(() => serving.delete(done.promise));
    const onClose = () => done.resolve();
    res.once("close", onClose);

    let router: Router;
    try {
      router = await version.router;
    } catch (error) {
      // Not with `next(error)`, which would log it again on every request.
      res
        .status(500)
        .type("text/plain")
        .send(error instanceof Error ? error.stack : String(error));
      return;
    }

    router(req, res, (error?: unknown) => {
      res.off("close", onClose);
      done.resolve();

      // Its render was aborted, as a newer version replaced it, and nothing
      // was sent yet, as renders send nothing until they're done: serve it
      // with that one instead. Not on `"route"` or `"router"`, which aren't
      // errors.
      if (
        version.controller.signal.aborted &&
        error instanceof Error &&
        !res.headersSent
      ) {
        void serve(current, req, res, next);
        return;
      }
      next(error);
    });
  };

  const app = express();

  app.use(morgan("dev"));

  app.get(MODULE_GRAPH_PATH, (_req, res) => {
    res.json(dumpModuleGraph());
  });

  // At the base path, where the site's root is.
  app.use(basepath || "/", (req, res, next) => {
    void serve(current, req, res, next);
  });

  // For as long as the process runs.
  site.subscribe(reload);
  devRouter.subscribe(reload);
  watchForReload((retired) => {
    // What's being served now may use it: e.g. a request to a version a
    // reload is replacing, until its render is aborted, once the new version
    // has loaded, and it's served again with that one.
    const inUse = [...serving];
    const loading = current.router;
    (async () => {
      await loading.catch(() => {});
      await Promise.all(inUse);
      retired.dispose();
    })().catch((error: unknown) => {
      console.error("Failed to dispose what a change replaced:", error);
    });
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }
      const { port: boundPort } = server.address() as AddressInfo;
      const siteMeta = makeSiteMeta(`http://localhost:${boundPort}`, basepath);
      console.log(`Listening on ${siteMeta.baseUrl}/`);
      console.log(
        `Hot reload's module graph: http://localhost:${boundPort}${MODULE_GRAPH_PATH}`,
      );
      served.resolve(siteMeta);
      resolve();
    });
  });
}
