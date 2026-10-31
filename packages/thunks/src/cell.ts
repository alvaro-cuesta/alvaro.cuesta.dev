import { brand, read, thunk, type Thunk } from "./thunk.ts";

/**
 * A thunk that can be invalidated, so the value it gives can change.
 *
 * Until it's invalidated, every read gets the same promise, like a {@link thunk}'s.
 *
 * Invalidating it only affects later reads: promises it already gave keep their value.
 *
 * Disposing it stops what invalidates it, if it was given a {@link Subscribe}. It still gives the
 * last promise it made, but that never changes again.
 */
export type Cell<T> = Thunk<T> &
  Disposable & {
    /** Makes the next read run `make` again, and every read after it get that new promise. */
    invalidate: () => void;
  };

/**
 * Starts whatever knows when a cell's value changes, like a file watcher, and has it call
 * `invalidate` then.
 *
 * @param invalidate Invalidates the cell.
 * @returns What stops it, when the cell is disposed.
 */
export type Subscribe = (invalidate: () => void) => Disposable;

/**
 * A cell that runs `make` the first time it's read, and again on the first read after each
 * time it's invalidated.
 *
 * It's subscribed the first time it's read, not when it's made: like its value, nothing that
 * watches for changes starts until someone asks for it. It's subscribed before `make` runs, so
 * a change while `make` runs still counts.
 *
 * @param make Makes the promise, the first time the cell is read after being created or
 *   invalidated.
 * @param subscribe Starts what invalidates the cell, if anything outside it knows when its value
 *   changes.
 * @returns The cell.
 */
export function cell<T>(
  make: () => Promise<T>,
  subscribe?: Subscribe,
): Cell<T> {
  let current = thunk(make);
  const invalidate = () => {
    current = thunk(make);
  };

  let subscription: Disposable | undefined;
  let disposed = false;

  return Object.assign(
    brand(() => {
      if (subscribe !== undefined && subscription === undefined && !disposed) {
        subscription = subscribe(invalidate);
      }
      return read(current);
    }),
    {
      invalidate,
      [Symbol.dispose]: () => {
        disposed = true;
        subscription?.[Symbol.dispose]();
      },
    },
  );
}
