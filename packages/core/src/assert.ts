/**
 * Marks where every case of `value` is already handled, e.g. a `switch`'s
 * `default`.
 *
 * `value` has to be `never` there, so leaving a case out fails type checking.
 * Reaching it anyway (e.g. with a value from outside the types) throws.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};
