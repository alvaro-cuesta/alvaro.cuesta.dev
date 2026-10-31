/**
 * A value you get later: calling it gives a promise for the value.
 *
 * Whoever calls it doesn't know or care where the value comes from, whether it's cached, or
 * whether it can change: that's the business of whoever made the thunk.
 */
export type Thunk<T> = () => Promise<T>;

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
  return () => (promise ??= make());
}
