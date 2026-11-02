import url from "node:url";
import { cell, derived, type Thunk } from "@xenon-ssg/thunks";
import { hotImport } from "@xenon-ssg/hot-reload";
import type { FileUrl } from "@xenon-ssg/import-url";
import { gitFileDates, type GitFileDates } from "./git.ts";

/** A content file: the module it compiles to, and when git says it was created and last modified. */
export type ContentFile<Module = unknown> = {
  module: Module;
  gitDates: GitFileDates | null;
};

/**
 * A content file, read again whenever what it's made from changes.
 *
 * In development, its module is imported again whenever the dev server says it changed: when the file, or anything it
 * imports, does. Its dates are read again whenever `HEAD` moves or the ignored commits change.
 *
 * Disposing it stops handling changes to the module, and nothing else handles them: a hot import's module has no
 * importer to reload instead (see `hotImport`). The dev server ignores them, until something imports the module again
 * and gets its latest version.
 *
 * @param file The file.
 * @returns The content file.
 */
export function contentFile<Module>(
  file: FileUrl<Module>,
): Thunk<ContentFile<Module>> & Disposable {
  const filePath = url.fileURLToPath(file);

  // Only this cell is invalidated when the file changes, instead of the module
  // that makes the content file, and the whole site with it.
  const module = cell(
    // Typed by the file: importing it by URL types it `any`.
    hotImport((): Promise<Module> => import(file.href)),
  );

  // Disposed along with the content file: nothing else reads it.
  return derived(async (get) => {
    // Together: the path is known before the import, so git needn't wait for
    // the file to compile.
    const [fileModule, gitDates] = await Promise.all([
      get(module),
      get(gitFileDates(filePath)),
    ]);

    return { module: fileModule, gitDates };
  }, module);
}
