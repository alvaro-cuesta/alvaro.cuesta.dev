import { cell } from "./cell.ts";
import { brand, read, type Thunk } from "./thunk.ts";

/**
 * Reads a thunk from a derived thunk's `make`, so it runs again once that thunk gives a new
 * promise.
 *
 * Only reads made while `make` is running count: once its promise settles, `get` still reads,
 * but nothing tracks what it reads.
 *
 * @param thunk The thunk to read.
 * @returns The thunk's promise.
 */
export type Get = <T>(thunk: Thunk<T>) => Promise<T>;

/** The promise each thunk gave the first time a run read it. */
type Reads = Map<Thunk<unknown>, Promise<unknown>>;

/**
 * A thunk whose value is made from other thunks' values, so it changes only when theirs do.
 *
 * It runs `make` the first time it's read, and again on the first read after any thunk `make`
 * read through `get` gives a new promise. Until then, every read gets the same promise, like a
 * {@link thunk}'s.
 *
 * It checks what it read when it's read itself, not when what it read changes: nothing runs until
 * someone asks for the value.
 *
 * Running again only affects later reads: promises it already gave keep their value.
 *
 * @param make Makes the promise from what it reads through `get`, the first time the thunk is
 *   read and again after something it read changed.
 * @returns The thunk.
 */
export function derived<T>(make: (get: Get) => Promise<T>): Thunk<T> {
  // What the last run read. Nothing before the first run, so the first read just runs.
  let reads: Reads = new Map();

  const value = cell(() => {
    const runReads: Reads = new Map();
    let settled = false;
    reads = runReads;

    const get: Get = (thunk) => {
      const promise = read(thunk);
      // Keep the first promise: if a later read got a new one, the value already used the old one.
      if (!settled && !runReads.has(thunk)) runReads.set(thunk, promise);
      return promise;
    };

    const promise = make(get);
    const settle = () => {
      settled = true;
    };
    promise.then(settle, settle);
    return promise;
  });

  return brand(() => {
    if (![...reads].every(([thunk, promise]) => read(thunk) === promise)) {
      value.invalidate();
    }
    return read(value);
  });
}
