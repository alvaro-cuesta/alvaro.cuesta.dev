/**
 * A promise wrapper that caches the result of a promise maker function so that the same promise
 * instance is returned across multiple calls until `reset` is called.
 *
 * The stable promise instance is what makes this safe to pass to React's `use()` hook: React
 * requires the same promise reference across renders to suspend correctly.
 *
 * - `get`: Returns the cached promise, creating it on first call if `lazy` was set.
 * - `reset`: Discards the cached promise so the next `get` call re-invokes the maker.
 */
export type CachedPromise<T> = {
  get: () => Promise<T>;
  reset: () => void;
};

type CachedPromiseOptions = {
  /**
   * Whether the promise will be created immediately, or only on the first `get` call.
   */
  lazy?: boolean;
};

export const cachedPromise = <T>(
  make: () => Promise<T>,
  { lazy = false }: CachedPromiseOptions = {},
): CachedPromise<T> => {
  let current: Promise<T> | undefined = lazy ? undefined : make();

  return {
    get: () => (current ??= make()),
    reset: () => {
      current = undefined;
    },
  };
};
