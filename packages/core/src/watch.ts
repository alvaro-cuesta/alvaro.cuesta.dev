import { statSync } from "node:fs";
import fs, { type FileChangeInfo } from "node:fs/promises";
import path from "node:path";

/**
 * In **development only**, fire-and-forget watch the given file or directory
 * and call `onChange` with every change event. Does nothing in production
 * (`NODE_ENV !== "development"`).
 *
 * A file is watched through its directory, and only its own events count:
 * editors, and git with its own files, may save a file by renaming another one
 * over it, which would end a watch on the file itself. A path that doesn't
 * exist yet is watched like a file, so creating it counts as a change.
 *
 * The watch lasts until the returned `Disposable` is disposed, so `using` ends
 * it with its scope. Ignoring it keeps the watch for as long as the process
 * runs.
 *
 * Errors from `fs.watch` itself (file deleted, permissions changed, etc.)
 * are caught and logged as warnings rather than left as unhandled rejections
 * — a misbehaving watcher should not take the dev server down.
 *
 * Typically a `cell`'s subscription (see `@xenon-ssg/thunks`), so it's
 * invalidated on source-file edits, but the callback is generic and can do
 * anything:
 *
 * ```ts
 * const page = cell(loadPage, (invalidate) => watchInDev(filePath, invalidate));
 * ```
 *
 * @returns What stops the watch when disposed.
 */
export function watchInDev(
  watchPath: string,
  onChange: (event: FileChangeInfo<string>) => void,
): Disposable {
  const controller = new AbortController();
  const watch = { [Symbol.dispose]: () => controller.abort() };
  if (process.env["NODE_ENV"] !== "development") return watch;

  // Synchronously, so the watch still starts before this returns, and sees
  // changes the caller makes right after.
  const isDirectory =
    statSync(watchPath, { throwIfNoEntry: false })?.isDirectory() ?? false;
  const directory = isDirectory ? watchPath : path.dirname(watchPath);
  const fileName = isDirectory ? null : path.basename(watchPath);

  void (async () => {
    try {
      for await (const event of fs.watch(directory, {
        signal: controller.signal,
      })) {
        if (fileName === null || event.filename === fileName) onChange(event);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn(`[watchInDev] watch on ${watchPath} aborted:`, err);
    }
  })();
  return watch;
}
