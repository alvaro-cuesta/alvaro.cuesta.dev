import { thunk, type Thunk } from "./thunk.ts";

/**
 * A thunk that can be invalidated, so the value it gives can change.
 *
 * Until it's invalidated, every call gets the same promise, like a {@link thunk}'s.
 *
 * Invalidating it only affects later calls: promises it already gave keep their value.
 */
export type Cell<T> = Thunk<T> & {
  /** Makes the next call run `make` again, and every call after it get that new promise. */
  invalidate: () => void;
};

/**
 * A cell that runs `make` the first time it's called, and again on the first call after each
 * time it's invalidated.
 *
 * @param make Makes the promise, the first time the cell is called after being created or
 *   invalidated.
 * @returns The cell.
 */
export function cell<T>(make: () => Promise<T>): Cell<T> {
  let current = thunk(make);
  return Object.assign(() => current(), {
    invalidate: () => {
      current = thunk(make);
    },
  });
}
