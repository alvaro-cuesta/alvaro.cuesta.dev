import type { Thunk } from "./thunk.ts";

/**
 * Thunks made one per key: calling it with a key gives that key's thunk, without reading it.
 *
 * The same key always gives the same thunk, so reading it through `get` tracks one value, not a new one every time.
 *
 * It owns its members: a member lives until {@link Family.retain} drops it, or the family is disposed, and is disposed
 * then. Once the family is disposed, calling it or `retain` throws a `ReferenceError`, like a `DisposableStack` used
 * after it's disposed.
 */
export type Family<K, V extends Thunk<unknown> & Disposable> = ((key: K) => V) &
  Disposable & {
    /**
     * Drops the members whose key isn't in `keys`, disposing them.
     *
     * Calling it with a dropped key again makes a new member.
     */
    retain: (keys: Iterable<K>) => void;
  };

/**
 * A family that makes each key's thunk with `make`, the first time it's called with that key.
 *
 * Keys are compared like a `Map`'s, so two equal strings are the same key, but two equal objects aren't.
 *
 * @param make Makes a key's thunk, which the family owns: a new one, not one something else also owns.
 * @returns The family.
 */
export function family<K, V extends Thunk<unknown> & Disposable>(
  make: (key: K) => V,
): Family<K, V> {
  const members = new Map<K, V>();
  let isDisposed = false;

  const assertNotDisposed = () => {
    if (isDisposed) {
      throw new ReferenceError("Used a family after it was disposed");
    }
  };

  return Object.assign(
    (key: K): V => {
      assertNotDisposed();

      let member = members.get(key);

      if (member === undefined) {
        member = make(key);
        members.set(key, member);
      }

      return member;
    },
    {
      retain: (keys: Iterable<K>) => {
        assertNotDisposed();

        const kept = new Set(keys);

        for (const [key, member] of members) {
          if (kept.has(key)) continue;

          members.delete(key);
          member[Symbol.dispose]();
        }
      },
      [Symbol.dispose]: () => {
        if (isDisposed) return;
        isDisposed = true;

        // So one member failing to dispose doesn't keep the rest from it.
        using stack = new DisposableStack();
        for (const member of members.values()) {
          stack.use(member);
        }
        members.clear();
      },
    },
  );
}
