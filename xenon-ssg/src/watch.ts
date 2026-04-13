import fs from "node:fs/promises";

/**
 * In **development only**, fire-and-forget watch the given file or directory
 * and call `onChange` on every change event. Does nothing in production
 * (`NODE_ENV !== "development"`).
 *
 * Errors from `fs.watch` itself (file deleted, permissions changed, etc.)
 * are caught and logged as warnings rather than left as unhandled rejections
 * — a misbehaving watcher should not take the dev server down.
 *
 * Typically paired with a {@link cachedPromise} so its `reset()` runs on
 * source-file edits, but the callback is generic and can do anything:
 *
 * ```ts
 * const page = cachedPromise(loadPage, { lazy: true });
 * watchInDev(filePath, () => page.reset());
 * ```
 */
export function watchInDev(
  watchPath: string,
  onChange: () => void,
): void {
  if (process.env["NODE_ENV"] !== "development") return;
  void (async () => {
    try {
      for await (const _ of fs.watch(watchPath)) {
        onChange();
      }
    } catch (err) {
      console.warn(`[watchInDev] watch on ${watchPath} aborted:`, err);
    }
  })();
}
