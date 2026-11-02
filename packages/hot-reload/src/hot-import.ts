/** The module an import resolved to, and the module whose code made it. */
export type ClaimedImport = {
  /** Undefined for modules that are never versioned, e.g. dependencies. */
  modulePath: string | undefined;
  importerPath: string | undefined;
};

/**
 * Runs `load`, and tells which module the `import()` it makes resolves to.
 * Throws if it doesn't make exactly one.
 */
export type ClaimImport = <T>(load: () => T) => ClaimedImport & { result: T };

// Set by the hooks when they're loaded, i.e. only in the dev server: without
// them, nothing is versioned and there's nothing to track.
let claimImport: ClaimImport | undefined;

/** For the hooks, to track the imports {@link hotImport} makes. */
export const setClaimImport = (claim: ClaimImport): void => {
  claimImport = claim;
};

/** A {@link HotImport} subscription still in force. */
export type HotImportSubscription = {
  onChange: (reason: string) => void;
  /** What the hot import last imported, if it was ever loaded. */
  claimed: () => ClaimedImport | undefined;
};

const subscriptions = new Set<HotImportSubscription>();

/**
 * A module imported by a function, whose changes whoever loads it handles
 * itself.
 */
export type HotImport<Module> = {
  /** Imports the latest version of the module. */
  load: () => Promise<Module>;
  /**
   * Calls `onChange` (with why) whenever the module, or anything it imports,
   * changes, until the returned `Disposable` is disposed.
   *
   * The same `onChange` subscribed to several hot imports is called once for
   * a change that reaches more than one of them.
   */
  subscribe: (onChange: (reason: string) => void) => Disposable;
};

/**
 * Makes the module `load` imports (e.g. `() => import("./post.mdx")`) one that
 * whoever calls {@link HotImport.load} handles changes to, instead of the
 * module `load` is written in.
 *
 * In the dev server, a change to the module, or to anything it imports, calls
 * the subscribers, and stops there: neither the module `load` is written in
 * nor its importers are evaluated again. The next `load` evaluates the module
 * again and gets the new version. So whoever loads it must keep nothing it
 * made from it but through `load` (e.g. a cell, see `@xenon-ssg/thunks`):
 *
 * ```ts
 * const postModule = cell(hotImport(() => import("./post.mdx")));
 * ```
 *
 * `load` must make exactly one `import()`, right away: in the dev server, the
 * hooks (`@xenon-ssg/hot-reload/hooks`) tell which module it imported from the
 * import they resolve while it runs. So it rejects if `load` returns a promise
 * it made earlier, or awaits anything before importing, or imports twice.
 *
 * Elsewhere (production, tests), `load` is just called, and subscribers are
 * never called.
 */
export function hotImport<Module>(
  load: () => Promise<Module>,
): HotImport<Module> {
  let claimed: ClaimedImport | undefined;

  return {
    load: () => {
      if (claimImport === undefined) return load();

      try {
        const { result, ...claim } = claimImport(load);
        claimed = claim;
        return result;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    subscribe: (onChange) => {
      const subscription: HotImportSubscription = {
        onChange,
        claimed: () => claimed,
      };
      subscriptions.add(subscription);
      return {
        [Symbol.dispose]: () => {
          subscriptions.delete(subscription);
        },
      };
    },
  };
}

/**
 * For the dev server: the subscriptions in force to the hot imports of the
 * modules at `modulePaths`.
 */
export function hotImportsOf(
  modulePaths: ReadonlySet<string>,
): HotImportSubscription[] {
  return [...subscriptions].filter((subscription) => {
    const modulePath = subscription.claimed()?.modulePath;
    return modulePath !== undefined && modulePaths.has(modulePath);
  });
}
