import fs, { type FileChangeInfo } from "node:fs/promises";

/**
 * In **development only**, fire-and-forget watch the given file or directory
 * and call `onChange` with every change event. Does nothing in production
 * (`NODE_ENV !== "development"`).
 *
 * The watch lasts until the returned `Disposable` is disposed, so `using` ends
 * it with its scope. Ignoring it keeps the watch for as long as the process
 * runs.
 *
 * Errors from `fs.watch` itself (file deleted, permissions changed, etc.)
 * are caught and logged as warnings rather than left as unhandled rejections
 * — a misbehaving watcher should not take the dev server down.
 *
 * Typically paired with a `cell` (see `@xenon-ssg/thunks`) so it's invalidated
 * on source-file edits, but the callback is generic and can do anything:
 *
 * ```ts
 * const page = cell(loadPage);
 * watchInDev(filePath, () => page.invalidate());
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
  void (async () => {
    try {
      for await (const event of fs.watch(watchPath, {
        signal: controller.signal,
      })) {
        onChange(event);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn(`[watchInDev] watch on ${watchPath} aborted:`, err);
    }
  })();
  return watch;
}
