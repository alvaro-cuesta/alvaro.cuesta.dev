import { fileURLToPath } from "node:url";
import { startXenonExpressDevApp } from "@xenon-ssg/express/dev";

await startXenonExpressDevApp(() => import("../src/site.tsx"), {
  // The whole workspace, including the Xenon packages.
  watchRoot: fileURLToPath(new URL("../..", import.meta.url)),
  // Node runs its imports (tsx and the `.mdx` loader) before the hot reload
  // hooks, so they don't see the loader's: it restarts on changes itself.
  nodeArgs: ["--config-file=node.config.json"],
  // Like the build, to try the site where a build for it would be deployed.
  basepath: process.env["XENON_BASE_PATH"],
});
