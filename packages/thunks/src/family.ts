import type { Thunk } from "./thunk.ts";

/**
 * Thunks made one per key: calling it with a key gives that key's thunk.
 *
 * The same key always gives the same thunk, so reading it through `get` tracks one value, not a new one every time.
 *
 * A member lives until {@link Family.retain} drops it, and is disposed then if it's `Disposable`.
 */
export type Family<K, V extends Thunk<unknown>> = ((key: K) => V) & {
  /**
   * Drops the members whose key isn't in `keys`, disposing the ones that are `Disposable`.
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
 * @param make Makes a key's thunk.
 * @returns The family.
 */
export function family<K, V extends Thunk<unknown>>(
  make: (key: K) => V,
): Family<K, V> {
  const members = new Map<K, V>();

  return Object.assign(
    (key: K): V => {
      let member = members.get(key);

      if (member === undefined) {
        member = make(key);
        members.set(key, member);
      }

      return member;
    },
    {
      retain: (keys: Iterable<K>) => {
        const kept = new Set(keys);

        for (const [key, member] of members) {
          if (kept.has(key)) continue;

          members.delete(key);
          if (Symbol.dispose in member) {
            (member as V & Disposable)[Symbol.dispose]();
          }
        }
      },
    },
  );
}
