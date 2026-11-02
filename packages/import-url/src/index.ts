declare const fileModule: unique symbol;

/**
 * A file, by its URL, and what importing it gives.
 *
 * `import file from "./post.mdx" with { type: "url" }` gives one without
 * loading the file, so whatever is made from it (e.g. its module, or its git
 * dates) can all start from it at once. Its type comes from the
 * `declare module ... with { type: "url" }` that matches the import (see
 * `@xenon-ssg/import-url/types`).
 *
 * `Module` is only in the type: importing `file.href` gives it.
 */
export type FileUrl<Module = unknown> = URL & {
  readonly [fileModule]: Module;
};

/**
 * A file known only at runtime, e.g. one a folder lists.
 *
 * Importing it gives `unknown`: only a declaration can say more.
 *
 * @param url The file's URL.
 * @returns The file.
 */
export const toFileUrl = (url: URL): FileUrl =>
  // Sound, as any import gives `unknown`.
  url as FileUrl;

/**
 * The file, typed by its module, which its import can't type yet.
 *
 * Unchecked: nothing ties `Module` to the file, so write it as
 * `typeof import(...)` of the same path, e.g.
 * `withModule<typeof import("./post.mdx")>(post)`. That only names the types:
 * it doesn't load the module.
 *
 * @todo Drop it once the import types the file by its module (see
 * `types.d.ts`).
 *
 * @param file The file.
 * @returns The same file.
 */
export const withModule = <Module>(file: FileUrl): FileUrl<Module> =>
  // Unsound: the caller's word, as nothing can check it yet.
  file as FileUrl<Module>;
