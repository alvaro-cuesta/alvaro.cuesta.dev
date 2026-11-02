import { fileURLToPath } from "node:url";
import { VERSION_PARAM } from "./version.ts";

/** Each versioned copy's stack, by the copy's URL, until a change retires it. */
const stacks = new Map<string, DisposableStack>();
/**
 * The version each module a change reached is at: copies of older versions
 * are out of date.
 */
const latestVersions = new Map<string, number>();
/**
 * The URLs of the copies that were already out of date when they were
 * evaluated, for the next change to retire.
 */
const lateUrls = new Set<string>();

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

    // Out of date already, e.g. evaluated by a load that started before a
    // change, which a newer load replaces: the change couldn't retire it.
    const latestVersion = latestVersions.get(fileURLToPath(url));
    if (latestVersion !== undefined && Number(version) < latestVersion) {
      lateUrls.add(url.href);
    }
  }
  return stack;
}

/**
 * For the dev server: retires the copies of the modules at `modulePaths`,
 * which a change made out of date.
 *
 * @param modulePaths The modules the change reached.
 * @param versionOf The version each of them is at now.
 * @returns What those copies own, for the dev server to dispose once nothing
 *   uses them. Also what the copies that were already out of date when they
 *   were evaluated, since the change before, own.
 */
export function retireModules(
  modulePaths: ReadonlySet<string>,
  versionOf: (modulePath: string) => number | undefined,
): DisposableStack {
  for (const modulePath of modulePaths) {
    const version = versionOf(modulePath);
    if (version !== undefined) latestVersions.set(modulePath, version);
  }

  // Out of `stacks` too, so a copy that asks for its stack again after this
  // gets a new one, not one that's disposed.
  //
  // TODO: once Node can drop a module from its cache
  // (https://github.com/nodejs/node/pull/61767, `Module.clearCache`), drop
  // every copy this retires too, deferred on `retired`, so it happens once
  // nothing uses them. Every one, not only those with a stack. That frees
  // them, once their stacks are disposed: until then, what they own (e.g. a
  // watcher) still reaches them. Then `MAX_RSS_BYTES` in `reload.ts` can go.
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
  const retired = new DisposableStack();
  for (const [url, stack] of stacks) {
    if (!lateUrls.has(url) && !modulePaths.has(fileURLToPath(url))) continue;

    stacks.delete(url);
    retired.use(stack);
  }
  lateUrls.clear();

  return retired;
}
