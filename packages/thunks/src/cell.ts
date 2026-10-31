import { brand, read, thunk, type Thunk } from "./thunk.ts";

/**
 * A thunk that can be invalidated, so the value it gives can change.
 *
 * Until it's invalidated, every read gets the same promise, like a {@link thunk}'s.
 *
 * Invalidating it only affects later reads: promises it already gave keep their value.
 */
export type Cell<T> = Thunk<T> & {
  /** Makes the next read run `make` again, and every read after it get that new promise. */
  invalidate: () => void;
};

/**
 * A cell that runs `make` the first time it's read, and again on the first read after each
 * time it's invalidated.
 *
 * @param make Makes the promise, the first time the cell is read after being created or
 *   invalidated.
 * @returns The cell.
 */
export function cell<T>(make: () => Promise<T>): Cell<T> {
  let current = thunk(make);
  return Object.assign(brand(() => read(current)), {
    invalidate: () => {
      current = thunk(make);
    },
  });
}
