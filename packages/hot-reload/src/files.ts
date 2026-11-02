import path from "node:path";

/**
 * Whether the module at `modulePath` is the app's own, i.e. not a dependency's.
 * Dependencies don't change while it runs, and a second instance of one (e.g.
 * React) would break whatever relies on there being only one.
 *
 * A workspace package (e.g. one pnpm links) counts as the app's own: Node
 * resolves the link to its real path, which isn't in `node_modules`. So it's
 * versioned like the app's code, and a file both the shell and the app import
 * is loaded twice, once for each (see `hooks.ts`).
 */
export const isOwnModule = (modulePath: string): boolean =>
  !modulePath.split(path.sep).includes("node_modules");
