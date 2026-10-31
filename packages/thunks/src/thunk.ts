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
 */
export type Thunk<T> = { readonly [thunkBrand]: () => Promise<T> };

/**
 * Makes a thunk that `get` reads.
 *
 * Only for this package's thunk makers: they're what make sure `get` keeps giving the same
 * promise until the value changes.
 *
 * @param get Gives the promise.
 * @returns The thunk.
 */
export function brand<T>(get: () => Promise<T>): Thunk<T> {
  return { [thunkBrand]: get };
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
 * @param make Makes the promise, the first time the thunk is read.
 * @returns The thunk.
 */
export function thunk<T>(make: () => Promise<T>): Thunk<T> {
  let promise: Promise<T> | undefined;
  return brand(() => (promise ??= make()));
}
