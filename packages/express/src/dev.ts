// Runs in the dev server's supervisor too, which has no loader: import nothing
// from `.tsx` here but types, which Node strips, and nothing that registers
// hot reload's hooks (see `dev-server.ts`).

import { superviseDevServer } from "@xenon-ssg/hot-reload/supervisor";
import type { UnknownRecord } from "type-fest";
import type { XenonExpressSiteModule } from "./index.tsx";

const DEFAULT_DEV_PORT = 31337;

type StartXenonExpressDevAppOptions = {
  /** Where a change starts the dev server again after it fails. */
  watchRoot: string;
  /** Node options for the dev server, e.g. the loaders the site needs. */
  nodeArgs?: string[];
  port?: number;
  /**
   * Where to serve the site, if not at the root (e.g. `/repo`), to try it where
   * a build for it would be deployed.
   */
  basepath?: string | undefined;
};

/**
 * Start a dev server for the site the module `loadSite` imports makes with its
 * `makeSite` export (see `XenonExpressSiteModule`). `loadSite` must make just
 * that `import()`, right away (e.g. `() => import("./site.tsx")`), to import
 * it again when it changes (see `hotImport` in `@xenon-ssg/hot-reload`).
 *
 * Runs it in a child process, which runs the calling script again, and
 * restarts it when its own modules change, or once a file in `watchRoot`
 * changes after it fails (see `superviseDevServer` in
 * `@xenon-ssg/hot-reload/supervisor`). So the script must call this before
 * doing anything else, as everything before it runs in both.
 *
 * Listens before the site loads: loading a site imports all its modules, which
 * blocks the thread for a while, so it only starts once the port is bound.
 * Requests that arrive in the meantime wait for the site instead of failing to
 * connect, and if it fails to load, every request responds with the error.
 *
 * Hot reloads the site: when a module changes, it evaluates that module again
 * along with what imports it, and loads the site again if that reaches it (see
 * `watchForReload` in `@xenon-ssg/hot-reload/reload`, for what that asks of
 * the site's modules). Requests use the latest site.
 *
 * To serve it from a server of your own instead (e.g. with other sites, or
 * behind a proxy), see `makeXenonDevRouter`.
 */
export async function startXenonExpressDevApp<
  PageMetadata extends UnknownRecord,
>(
  loadSite: () => Promise<XenonExpressSiteModule<PageMetadata>>,
  {
    watchRoot,
    nodeArgs = [],
    port = DEFAULT_DEV_PORT,
    basepath = "",
  }: StartXenonExpressDevAppOptions,
): Promise<void> {
  await superviseDevServer({
    watchRoot,
    nodeArgs,
    serve: async () => {
      // Only here, as it registers hot reload's hooks, which the supervisor
      // must not.
      const { serveXenonExpressSite } = await import("./dev-server.ts");
      await serveXenonExpressSite(loadSite, port, basepath);
    },
  });
}
