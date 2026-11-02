import { VERSION_PARAM } from "./version.ts";

/** Each versioned copy's stack, by the copy's URL, until it's retired. */
const stacks = new Map<string, DisposableStack>();

/**
 * What the copy of the module `importMeta` belongs to owns, to dispose once a
 * reload replaces it: e.g. the thunks it makes at its top level, which keep
 * watching what they read until they're disposed.
 *
 * ```ts
 * const moduleOwned = moduleStack(import.meta);
 *
 * export const config = moduleOwned.use(
 *   cell(readConfig, (invalidate) => watchInDev(CONFIG_PATH, invalidate)),
 * );
 * ```
 *
 * In the dev server, once a change evaluates the module again, the old copy's
 * stack is disposed as soon as nothing uses it anymore (see `watchForReload`
 * in `@xenon-ssg/hot-reload/reload`). Every call from the same copy gives the
 * same stack.
 *
 * Elsewhere (production, tests), modules are never evaluated again, so it's
 * never disposed: every call gives a new stack, which nothing else keeps.
 *
 * @param importMeta The module's `import.meta`.
 * @returns The stack.
 */
export function moduleStack(importMeta: ImportMeta): DisposableStack {
  const url = new URL(importMeta.url);
  const version = url.searchParams.get(VERSION_PARAM);
  // Not versioned, so it's never evaluated again.
  if (version === null) return new DisposableStack();

  let stack = stacks.get(url.href);
  if (stack === undefined) {
    stack = new DisposableStack();
    stacks.set(url.href, stack);
  }
  return stack;
}

/**
 * For the dev server: retires the copies `isRetired` tells, e.g. those a change
 * made out of date, or those nothing in use imports anymore (see `isOutOfDate`
 * and `copiesInUse` in `hooks.ts`).
 *
 * Told which with a function, rather than asking the hooks: apps import this
 * module, and importing the hooks registers them.
 *
 * A copy that's already out of date when it asks for its stack (e.g. one a
 * load that started before a change evaluates after it) gets one all the
 * same, which the next call retires, as it's still out of date. So nothing
 * needs to remember it until then.
 *
 * @param isRetired Whether to retire the copy at a URL.
 * @returns What those copies own, for the dev server to dispose once nothing
 *   uses them, if any of them owns anything.
 */
export function retireCopies(
  isRetired: (url: string) => boolean,
): DisposableStack | undefined {
  // Out of `stacks` too, so a copy that asks for its stack again after this
  // gets a new one, not one that's disposed.
  //
  // TODO: once Node can drop a module from its cache
  // (https://github.com/nodejs/node/pull/61767, `Module.clearCache`), drop
  // every copy that's out of date or out of use too, deferred on `retired`, so
  // it happens once nothing uses them. Every one, not only those with a stack,
  // which are all this sees. That frees them, once their stacks are disposed:
  // until then, what they own (e.g. a watcher) still reaches them. Then
  // `MAX_RSS_BYTES` in `reload.ts` can go.
  //
  // Then investigate what being freed makes unnecessary, as it may simplify
  // disposal: what only holds memory (e.g. a cell's large value) would go with
  // its copy, so maybe only what holds something outside it (a watcher, a
  // timer, a socket) needs disposing. Check how it propagates, e.g. whether a
  // thunk that another copy still reads keeps its own copy alive, and whether
  // thunks' disposal could then shrink to just letting go of those. And along
  // the import chains a change invalidates: what's still alive where they stop
  // (at hot imports, at the shell, at the modules a change doesn't reach,
  // which keep their instances), and what it still holds of the copies past
  // that point, e.g. the dev server the site it last loaded. Weigh what that
  // loses, too: a disposed thunk rejects every read, so one kept past its
  // owner's lifetime fails loudly. One that's only freed, or never is because
  // something still reads it, would give its last value instead. And check
  // circular references, even between retired copies: the garbage collector
  // frees a cycle nothing reaches, but not one that goes through a copy that's
  // still alive, and maybe not one Node's own references keep (the PR mentions
  // some it doesn't clear yet, from a module's record to those it imports).
  let retired: DisposableStack | undefined;
  for (const [url, stack] of stacks) {
    if (!isRetired(url)) continue;

    stacks.delete(url);
    retired ??= new DisposableStack();
    retired.use(stack);
  }
  return retired;
}

/** For debugging: whether the copy at `url` has a stack it hasn't retired. */
export const hasStack = (url: string): boolean => stacks.has(url);
