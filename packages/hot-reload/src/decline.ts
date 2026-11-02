import { fileURLToPath } from "node:url";
import { isDevelopment } from "./env.ts";

const declinedPaths = new Set<string>();

/**
 * In **development only**, has the dev server restart instead of evaluating
 * the module `importMeta` belongs to again: whenever a change reaches it, i.e.
 * when its file changes, or anything it imports does. Does nothing in
 * production (`NODE_ENV !== "development"`).
 *
 * It's for modules a second copy of would break, e.g. one that holds a port or
 * a lock it can't let go of in its `moduleStack`.
 *
 * Unlike `restartOnChangeInDev` with its own path, it also counts changes to
 * what it imports, which evaluate it again too.
 *
 * @param importMeta The module's `import.meta`.
 */
export function declineInDev(importMeta: ImportMeta): void {
  if (!isDevelopment()) return;

  declinedPaths.add(fileURLToPath(importMeta.url));
}

/** For the dev server: whether {@link declineInDev} declined the module at `modulePath`. */
export const isDeclined = (modulePath: string): boolean =>
  declinedPaths.has(modulePath);
