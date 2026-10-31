/** Marks the functions this package made as thunks. Not exported, so nothing else can. */
const thunkBrand: unique symbol = Symbol("thunk");

/**
 * A value you get later: calling it gives a promise for the value.
 *
 * Every call gets the same promise until the value changes, so a new promise means a new value.
 *
 * Only this package makes thunks, so a function that just returns a promise isn't one.
 *
 * Whoever calls it doesn't know or care where the value comes from, whether it's cached, or
 * whether it can change: that's the business of whoever made the thunk.
 */
export type Thunk<T> = (() => Promise<T>) & { readonly [thunkBrand]: true };

/**
 * Marks `get` as a thunk.
 *
 * Only for this package's thunk makers: they're what make sure `get` keeps giving the same
 * promise until the value changes.
 *
 * @param get Gives the promise.
 * @returns `get` itself, marked.
 */
export function brand<T>(get: () => Promise<T>): Thunk<T> {
  return Object.assign(get, { [thunkBrand]: true as const });
}

/**
 * A thunk that runs `make` the first time it's called, and gives every call that same promise.
 *
 * Nothing runs until then, so a value nobody asks for is never made, and a rejection can't go
 * unhandled before anyone asks.
 *
 * The promise never changes, not even after it rejects, which is what React's `use()` needs.
 *
 * @param make Makes the promise, the first time the thunk is called.
 * @returns The thunk.
 */
export function thunk<T>(make: () => Promise<T>): Thunk<T> {
  let promise: Promise<T> | undefined;
  return brand(() => (promise ??= make()));
}
