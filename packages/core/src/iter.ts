/**
 * Map an iterable to another iterable.
 */
export function* mapIter<In, Out>(
  /** The iterable to map. */
  iter: Iterable<In>,
  /** The mapping function. */
  fn: (item: In) => Out,
): Iterable<Out> {
  for (const item of iter) {
    yield fn(item);
  }
}
