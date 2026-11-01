import fs from "node:fs/promises";
import url from "node:url";
import { cell, derived, type Thunk } from "@xenon-ssg/thunks";
import { watchInDev } from "@xenon-ssg/core/watch";
import { gitFileDates, type GitFileDates } from "./git.ts";

/** A content file: the module it compiles to, and when git says it was created and last modified. */
export type ContentFile = {
  module: unknown;
  gitDates: GitFileDates | null;
};

/**
 * A content file, read again whenever what it's made from changes.
 *
 * In development, its module is imported again whenever the file changes. Its dates are read again whenever `HEAD`
 * moves or the ignored commits change.
 *
 * Disposing it stops watching the file.
 *
 * @param fileUrl The file's URL.
 * @returns The content file.
 */
export function contentFile(fileUrl: string): Thunk<ContentFile> & Disposable {
  const isDev = process.env["NODE_ENV"] === "development";
  const filePath = url.fileURLToPath(fileUrl);

  // The file's version on disk. In nanoseconds, so no two saves share one.
  const mtime = cell(
    async () => (await fs.stat(filePath, { bigint: true })).mtimeNs,
    (invalidate) => watchInDev(filePath, invalidate),
  );

  const module = derived(async (get): Promise<unknown> => {
    // Node caches modules by URL and never frees them, so in dev the URL
    // carries the file's version: an edit gets a new URL, and so a fresh
    // module, but reading the same version again reuses the cached one instead
    // of leaking another copy. In production each file is imported once, so
    // the bare URL will do, and the file is never stat'd.
    const importUrl = isDev ? `${fileUrl}?${await get(mtime)}` : fileUrl;

    return import(importUrl);
  });

  // Disposed along with the content file: nothing else reads them.
  const owned = new DisposableStack();
  owned.use(mtime);
  owned.use(module);

  return derived(async (get) => {
    const [fileModule, gitDates] = await Promise.all([
      get(module),
      get(gitFileDates(filePath)),
    ]);

    return { module: fileModule, gitDates };
  }, owned);
}
