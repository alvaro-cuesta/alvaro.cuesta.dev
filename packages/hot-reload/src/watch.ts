import { statSync } from "node:fs";
import fs, { type FileChangeInfo } from "node:fs/promises";
import path from "node:path";
import { isDevelopment } from "./env.ts";

/**
 * What the file at `filePath` looks like on disk: its modification time, in
 * nanoseconds so no two saves share one, and its size. Empty if it doesn't
 * exist.
 */
const stampOf = (filePath: string): string => {
  const stats = statSync(filePath, { bigint: true, throwIfNoEntry: false });
  return stats === undefined ? "" : `${stats.mtimeNs}:${stats.size}`;
};

/**
 * In **development only**, fire-and-forget watch the given file or directory
 * and call `onChange` whenever a file in it changes. Does nothing in
 * production (`NODE_ENV !== "development"`).
 *
 * Only changes count: an event for a file that looks the same as at its last
 * one (same modification time and size) is dropped. One write gives more than
 * one event (two on Windows), and callers would otherwise do their work once
 * per event. A watched file is compared with how it looked when the watch
 * started.
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
  if (!isDevelopment()) return watch;

  // Synchronously, so the watch still starts before this returns, and sees
  // changes the caller makes right after.
  const isDirectory =
    statSync(watchPath, { throwIfNoEntry: false })?.isDirectory() ?? false;
  const directory = isDirectory ? watchPath : path.dirname(watchPath);
  const fileName = isDirectory ? null : path.basename(watchPath);

  // How each file looked at its last change.
  const stamps = new Map<string, string>();
  if (!isDirectory) stamps.set(watchPath, stampOf(watchPath));
  const isChange = (filename: string) => {
    const filePath = path.join(directory, filename);
    const stamp = stampOf(filePath);
    if (stamps.get(filePath) === stamp) return false;
    stamps.set(filePath, stamp);
    return true;
  };

  void (async () => {
    try {
      for await (const event of fs.watch(directory, {
        signal: controller.signal,
      })) {
        if (fileName !== null && event.filename !== fileName) continue;
        // Without a name there's nothing to compare, so it counts.
        if (event.filename !== null && !isChange(event.filename)) continue;
        onChange(event);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn(`[watchInDev] watch on ${watchPath} aborted:`, err);
    }
  })();

  return watch;
}
