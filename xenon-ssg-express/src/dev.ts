import express, { type Express } from "express";
import { makeXenonMiddleware } from "xenon-ssg/src/middleware";
import morgan from "morgan";
import { type XenonExpressSite, getSiteMeta } from ".";
import { getTagsFromInjectableRaw } from "./plugins/plugins";
import type { UnknownRecord } from "type-fest";

export const DEFAULT_DEV_PORT = 31337;

/**
 * Create an Express app that serves a Xenon site in development mode.
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

  const injectableRaw = plugins.flatMap((runnablePlugin) => {
    return (
      runnablePlugin.getInjectable?.({
        isBuild: false,
        siteMeta,
      }) ?? []
    );
  });

  const { injectable, injectableCritical } =
    getTagsFromInjectableRaw(injectableRaw);

  const render = (pathname: string) =>
    site.render({
      ...siteMeta,
      pathname,
      injectableRaw,
      injectable,
      injectableCritical,
    });

  app.use(makeXenonMiddleware(render, site.renderToStreamOptions));

  return app;
}

/**
 * Convenience function if you just want to quickly start a dev server.
 */
export function startXenonExpressDevApp<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
) {
  const app = makeXenonDevExpressApp(site);
  const port = site.devPort ?? DEFAULT_DEV_PORT;

  app.listen(port, "127.0.0.1", () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  return app;
}
