import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import inspector from "node:inspector";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parentPort, type Worker } from "node:worker_threads";
import { isDevelopment } from "./env.ts";
import { isOwnModule } from "./files.ts";
import { watchInDev } from "./watch.ts";

/** The exit code the dev server uses to ask {@link superviseDevServer} for a restart. */
export const RESTART_EXIT_CODE = 75;

const IGNORED_PATH_SEGMENTS = new Set(["node_modules", ".git", "dist"]);

// Set for the dev server, which runs the same script as its supervisor, to
// tell them apart.
const DEV_SERVER_ENV = "XENON_HOT_RELOAD_DEV_SERVER";

type SuperviseDevServerOptions = {
  /** Starts the dev server. Only runs in the dev server's process. */
  serve: () => void | Promise<void>;
  /** Where a change starts the dev server again after it fails. */
  watchRoot: string;
  /**
   * Node options for the dev server only, e.g. loaders the supervisor doesn't
   * need.
   */
  nodeArgs?: string[];
};

/**
 * Runs the dev server in a child process, and starts a new one whenever it
 * exits with {@link RESTART_EXIT_CODE}: it does when code it can't reload
 * changes, e.g. its own. If it fails instead, waits for any file in
 * `watchRoot` to change before starting it again.
 *
 * Like `node:cluster`, the child runs the same script, with the same arguments
 * and Node options, and this tells which one it's in: the supervisor starts
 * the child, and the child calls `serve`. So the script must call this
 * before doing anything else, as everything before it runs in both.
 *
 * The child also gets `nodeArgs`, after hot reload's hooks
 * (`@xenon-ssg/hot-reload/hooks`), which it imports first so they see every
 * import but those Node makes before any `--import`: its config file's (see
 * {@link restartOnChangeInDev}).
 *
 * Debugging with `--inspect` debugs the child: the supervisor closes its own
 * inspector, so the child's can listen on the same port.
 *
 * Stopping the supervisor (`SIGINT`, `SIGTERM`, `SIGHUP`) stops the child, and
 * the supervisor then exits the way the child did. Otherwise, a child that
 * ends without asking for a restart or exiting with 0 failed, even one the
 * system killed.
 *
 * @returns In the child, once `serve` is done. In the supervisor, once the
 *   child has started.
 */
export async function superviseDevServer({
  serve,
  watchRoot,
  nodeArgs = [],
}: SuperviseDevServerOptions): Promise<void> {
  if (process.env[DEV_SERVER_ENV] !== undefined) {
    // So a process the dev server starts doesn't take itself for one.
    delete process.env[DEV_SERVER_ENV];
    await serve();
    return;
  }

  // Resolved here, not by the dev server: its folder may not see this package
  // (e.g. when only a dependency of the app depends on it).
  const hooksUrl = import.meta.resolve("@xenon-ssg/hot-reload/hooks");
  const args = [
    ...process.execArgv,
    "--import",
    hooksUrl,
    ...nodeArgs,
    ...process.argv.slice(1),
  ];

  // The child inherits `--inspect` too, and it's the one worth debugging, but
  // its inspector can't listen on the port this one holds.
  if (inspector.url() !== undefined) inspector.close();

  // The running child, if any: none while waiting for a change after a
  // failure.
  let child: ChildProcess | undefined;
  let isStopping = false;

  // Stops the child too, whose exit then ends the supervisor. Ctrl+C in a
  // terminal reaches both, but e.g. `kill`, or a process manager, only reaches
  // the supervisor, and a child left behind keeps the port.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => {
      isStopping = true;
      if (child === undefined) {
        process.exit(128 + os.constants.signals[signal]);
      }
      child.kill(signal);
    });
  }
  // However else the supervisor exits, e.g. on an uncaught exception.
  process.on("exit", () => child?.kill());

  const start = () => {
    const started = spawn(process.execPath, args, {
      stdio: "inherit",
      env: { ...process.env, [DEV_SERVER_ENV]: "1" },
    });
    child = started;

    started.on("exit", (code, signal) => {
      child = undefined;

      if (isStopping) {
        process.exit(
          code ?? (signal === null ? 1 : 128 + os.constants.signals[signal]),
        );
      }

      if (code === RESTART_EXIT_CODE) {
        start();
        return;
      }

      if (code === 0) {
        process.exit(0);
      }

      // Not by the supervisor, so e.g. by the system for running out of
      // memory: a failure like any other.
      const how =
        signal === null ? `exited with code ${code}` : `was killed (${signal})`;
      console.error(`Dev server ${how}, restarting on the next change`);
      // One change can come as several events, even in the same batch: only
      // the first starts it again.
      let isRestarting = false;
      const watcher = fs.watch(
        watchRoot,
        { recursive: true },
        (_event, filename) => {
          if (
            isRestarting ||
            filename === null ||
            filename
              .split(/[\\/]/)
              .some((segment) => IGNORED_PATH_SEGMENTS.has(segment))
          ) {
            return;
          }
          isRestarting = true;
          watcher.close();
          start();
        },
      );
    });
  };

  start();
}

/**
 * Logs `message` and exits with {@link RESTART_EXIT_CODE}, for
 * {@link superviseDevServer} to start the dev server again.
 *
 * It's for code the dev server can't reload, e.g. its own, or what runs before
 * it (like a loader passed to Node with `--import`).
 */
export function restartDevServer(message: string): never {
  console.log(message);
  process.exit(RESTART_EXIT_CODE);
}

// The files each folder's watch restarts for: one watch per folder, however
// many of its files are added, over however many calls, as `watchInDev`
// watches a file through its folder anyway. Watched for as long as the
// process runs.
const restartPathsByFolder = new Map<string, Set<string>>();

/**
 * In **development only**, restarts the dev server (see
 * {@link restartDevServer}) when any of the files at `filePaths` changes. Does
 * nothing in production (`NODE_ENV !== "development"`).
 *
 * It's for modules hot reload can't reload: those Node loaded before its
 * hooks (e.g. a loader in Node's config file, which Node imports before any
 * `--import`), and those of other threads (see
 * {@link restartOnWorkerChangeInDev}).
 */
export function restartOnChangeInDev(filePaths: Iterable<string>): void {
  if (!isDevelopment()) return;

  for (const filePath of filePaths) {
    const folderPath = path.dirname(filePath);
    let restartPaths = restartPathsByFolder.get(folderPath);
    if (restartPaths === undefined) {
      const folderRestartPaths = new Set<string>();
      restartPaths = folderRestartPaths;
      restartPathsByFolder.set(folderPath, folderRestartPaths);
      watchInDev(folderPath, ({ filename }) => {
        if (filename === null) return;
        const changedPath = path.join(folderPath, filename);
        if (!folderRestartPaths.has(changedPath)) return;
        restartDevServer(
          `Restarting: ${path.relative(process.cwd(), changedPath)} changed`,
        );
      });
    }
    restartPaths.add(filePath);
  }
}

/** What {@link reportImportsInDev} posts to the main thread. */
type ImportsMessage = {
  type: typeof IMPORTS_MESSAGE_TYPE;
  modulePaths: string[];
};

// Tells these messages apart from the app's own on the same port.
const IMPORTS_MESSAGE_TYPE = "@xenon-ssg/hot-reload:imports";

const isImportsMessage = (message: unknown): message is ImportsMessage =>
  typeof message === "object" &&
  message !== null &&
  "type" in message &&
  message.type === IMPORTS_MESSAGE_TYPE;

/**
 * In **development only**, restarts the dev server when a module `worker`
 * imports changes: nothing reloads a worker's modules. Does nothing in
 * production (`NODE_ENV !== "development"`), so it doesn't keep an
 * `unref()`ed worker alive there.
 *
 * The worker must call {@link reportImportsInDev} to tell it what it imports,
 * which doesn't include its own module: pass that to
 * {@link restartOnChangeInDev}.
 */
export function restartOnWorkerChangeInDev(worker: Worker): void {
  if (!isDevelopment()) return;

  worker.on("message", (message: unknown) => {
    if (isImportsMessage(message)) restartOnChangeInDev(message.modulePaths);
  });
}

/**
 * In **development only**, reports every module this worker imports from now
 * on, except dependencies', to the main thread, for
 * {@link restartOnWorkerChangeInDev}. Does nothing in production
 * (`NODE_ENV !== "development"`), nor on the main thread.
 *
 * The worker can't restart the dev server itself: exiting only ends its
 * thread.
 */
export function reportImportsInDev(): void {
  if (!isDevelopment() || parentPort === null) return;
  const port = parentPort;

  const reported = new Set<string>();
  let pending: string[] = [];
  // In batches: a module's imports are resolved one after another.
  const flush = () => {
    port.postMessage({
      type: IMPORTS_MESSAGE_TYPE,
      modulePaths: pending,
    } satisfies ImportsMessage);
    pending = [];
  };

  registerHooks({
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context);
      if (!resolved.url.startsWith("file:")) return resolved;

      const modulePath = fileURLToPath(resolved.url);
      if (isOwnModule(modulePath) && !reported.has(modulePath)) {
        reported.add(modulePath);
        if (pending.length === 0) queueMicrotask(flush);
        pending.push(modulePath);
      }
      return resolved;
    },
  });
}
