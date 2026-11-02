import path from "node:path";
import { isDevelopment } from "./env.ts";
import {
  invalidate,
  isShellModule,
  isVersionedModule,
  onModulePath,
  versionOf,
} from "./hooks.ts";
import { hotImportsOf } from "./hot-import.ts";
import { retireModules } from "./module-stack.ts";
import { restartDevServer } from "./supervisor.ts";
import { watchInDev } from "./watch.ts";

// Editors often save in more than one write, and e.g. switching branches
// changes many files at once: they're applied together.
const CHANGE_DEBOUNCE_MS = 50;

// Node never frees a module, so every reload keeps the old instances of the
// modules it evaluates again. Past this, restart instead, which frees them.
// TODO: drop once retired copies are freed (see `retireModules`).
const MAX_RSS_BYTES = 1024 * 1024 * 1024;

const relativePath = (filePath: string) =>
  path.relative(process.cwd(), filePath);

// Set `DEBUG` to also log every module each change evaluates again.
const isDebug = Boolean(process.env["DEBUG"]);

/**
 * In **development only**, watches every module the app imports, and calls
 * the subscribers of every `hotImport` a change reaches, for them to load it
 * again. A subscriber is called once per change, however many of the hot
 * imports it subscribed to the change reached.
 *
 * When a module changes, the next import evaluates it again, along with the
 * modules that import it (directly or not), up to the hot imports that import
 * them: every other module keeps its instance, and its state. So the dev
 * server loads the app with a `hotImport` that reloads it, and the app can
 * keep a change from reaching it with its own.
 *
 * That only works if a module's state comes from nothing but its imports, and
 * cells (see `@xenon-ssg/thunks`) that watch anything else it reads, like
 * files that aren't modules. So a module must not change state it doesn't
 * own: not another module's (e.g. by registering itself in a registry it
 * imports), nor global state (`globalThis`, `process.env`, a dependency's).
 * The owner doesn't evaluate again, so it would keep that state, stale or
 * duplicated, across reloads. And what a module owns, like the cells it makes
 * at its top level, goes in its `moduleStack`: otherwise the copy a change
 * replaces keeps it, e.g. watching what its cells read, until a restart.
 *
 * `import.meta.resolve` goes through the same versioning, so the module that
 * calls it counts as an importer of what it resolves.
 *
 * A change to a module that isn't versioned (the dev server's own, and what
 * they import) exits with `RESTART_EXIT_CODE` instead, for
 * `superviseDevServer` to restart the dev server.
 *
 * Each change hands `onRetire` what the copies it made out of date own (see
 * `moduleStack`), after calling the hot imports' subscribers, for the dev
 * server to dispose once nothing uses them: e.g. once what it was serving when
 * the change came is done, and whatever the subscribers load again replaces
 * it.
 *
 * Needs the hooks (`@xenon-ssg/hot-reload/hooks`), which `superviseDevServer`
 * loads. Does nothing in production (`NODE_ENV !== "development"`).
 */
export function watchForReload(
  onRetire: (retired: DisposableStack) => void,
): void {
  if (!isDevelopment()) return;

  const watchedFolders = new Set<string>();
  let changedPaths = new Set<string>();
  let changeTimeout: NodeJS.Timeout | undefined;
  const scheduleChanges = () => {
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(applyChanges, CHANGE_DEBOUNCE_MS);
  };

  const applyChanges = () => {
    const paths = [...changedPaths];
    changedPaths = new Set();

    for (const changedPath of paths) {
      if (isShellModule(changedPath)) {
        restartDevServer(`Restarting: ${relativePath(changedPath)} changed`);
      }
    }

    const changedModules = paths.filter(isVersionedModule);
    if (changedModules.length === 0) return;
    const reason = `${changedModules.map(relativePath).join(", ")} changed`;

    if (process.memoryUsage.rss() > MAX_RSS_BYTES) {
      restartDevServer(`Restarting to free memory: ${reason}`);
    }

    const invalidated = invalidate(changedModules);
    const retired = retireModules(invalidated, versionOf);
    const hotImports = hotImportsOf(invalidated);

    if (isDebug) {
      for (const modulePath of invalidated) {
        console.debug(`  Evaluating again: ${relativePath(modulePath)}`);
      }
    }

    if (hotImports.length === 0) {
      console.log(`Nothing in use depends on it: ${reason}`);
    } else {
      // Where their `import()`s are written, which tells them apart better
      // than what they import: e.g. one module imports every post.
      const importers = new Set(
        hotImports.map(({ claimed }) => {
          const importerPath = claimed()?.importerPath;
          return importerPath === undefined ? "?" : relativePath(importerPath);
        }),
      );
      console.log(
        `Importing again from ${[...importers].join(", ")}: ${reason}`,
      );

      // Once each, even when subscribed to more than one hot import the change
      // reached: e.g. the dev server, which loads the site with two, would
      // otherwise load it twice.
      for (const onChange of new Set(hotImports.map((x) => x.onChange))) {
        try {
          onChange(reason);
        } catch (error) {
          console.error(`Failed to handle a change (${reason}):`, error);
        }
      }
    }

    // After the subscribers, so whatever they load again is already loading.
    onRetire(retired);
  };

  onModulePath((modulePath) => {
    // Each module's folder, not the module: `watchInDev` watches a file
    // through its folder anyway, and this way one watch covers all the modules
    // in it. Watched for as long as the process runs.
    const folderPath = path.dirname(modulePath);
    if (watchedFolders.has(folderPath)) return;
    watchedFolders.add(folderPath);
    watchInDev(folderPath, ({ filename }) => {
      if (filename === null) return;
      changedPaths.add(path.join(folderPath, filename));
      scheduleChanges();
    });
  });
}
