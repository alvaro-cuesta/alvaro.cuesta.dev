/** Where a thunk keeps what reads it. Not exported, so nothing else can make or read thunks. */
const thunkBrand: unique symbol = Symbol("thunk");

/**
 * A value you get later: reading it gives a promise for the value.
 *
 * Every read gets the same promise until the value changes, so a new promise means a new value.
 *
 * It can't be called: it's read through a derived thunk's `get`, which tracks the read, or through
 * {@link read}, which doesn't. So every read says whether it's tracked.
 *
 * Only this package makes thunks, so a function that just returns a promise isn't one.
 *
 * Whoever reads it doesn't know or care where the value comes from, whether it's cached, or
 * whether it can change: that's the business of whoever made the thunk.
 *
 * Whoever made it owns it, and disposes it once they're done with it, which lets go of its value
 * and stops whatever it watches. Every read after that gets a promise that rejects with a
 * `ReferenceError`, so a thunk someone kept past its owner's lifetime fails loudly instead of
 * giving a value that never changes again. A `Thunk` can't be disposed itself: that's only for
 * whoever has what its maker returned.
 */
export type Thunk<T> = { readonly [thunkBrand]: () => Promise<T> };

/**
 * Makes a thunk that `get` reads, until it's disposed.
 *
 * Only for this package's thunk makers: they're what make sure `get` keeps giving the same
 * promise until the value changes.
 *
 * Disposing it runs `dispose`, the first time only. Every read after that gets the same rejected
 * promise, without calling `get` (see {@link Thunk}).
 *
 * @param get Gives the promise.
 * @param dispose Lets go of what the thunk holds.
 * @returns The thunk.
 */
export function brand<T>(
  get: () => Promise<T>,
  dispose: () => void,
): Thunk<T> & Disposable {
  let isDisposed = false;
  let disposedRead: Promise<T> | undefined;

  return {
    [thunkBrand]: () => {
      if (!isDisposed) return get();
      // Made on the first read, not on disposal, so it's only reported as
      // unhandled when a read doesn't handle it. The same one every time, like
      // any thunk's promise while its value doesn't change. A `ReferenceError`,
      // like `DisposableStack`'s when it's used after it's disposed.
      return (disposedRead ??= Promise.reject(
        new ReferenceError("Read a thunk after it was disposed"),
      ));
    },
    [Symbol.dispose]: () => {
      if (isDisposed) return;
      isDisposed = true;
      dispose();
    },
  };
}

/**
 * Reads a thunk, without anything tracking the read.
 *
 * It's for the edge: code that runs again every time, and whose result nobody caches, like a
 * request handler or a page render.
 *
 * Inside a derived thunk's `make`, read through `get` instead: a read through `read` doesn't make
 * it run again when the thunk changes.
 *
 * @param thunk The thunk to read.
 * @returns The thunk's promise.
 */
export function read<T>(thunk: Thunk<T>): Promise<T> {
  return thunk[thunkBrand]();
}

/**
 * A thunk that runs `make` the first time it's read, and gives every read that same promise.
 *
 * Nothing runs until then, so a value nobody asks for is never made, and a rejection can't go
 * unhandled before anyone asks.
 *
 * The promise never changes, not even after it rejects, which is what React's `use()` needs.
 *
 * Disposing it lets go of the promise (see {@link Thunk}).
 *
 * @param make Makes the promise, the first time the thunk is read.
 * @returns The thunk.
 */
export function thunk<T>(make: () => Promise<T>): Thunk<T> & Disposable {
  let promise: Promise<T> | undefined;
  return brand(
    () => (promise ??= make()),
    () => {
      promise = undefined;
    },
  );
}
