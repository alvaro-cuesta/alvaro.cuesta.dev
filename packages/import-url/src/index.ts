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
