// Versions the app's modules, so the dev server can evaluate again only the
// ones that changed (see `reload.ts`). `superviseDevServer` passes it to Node
// with `--import`, so it also sees the imports that happen before the dev
// server starts.
//
// A module imported from a versioned module is versioned too: its URL gets a
// `?v=N` that goes up when the module, or anything it imports, changes. Until
// then, importing it again gives the same instance. So is a module a
// `hotImport` imports, wherever its `import()` is written: those are the roots
// of the app.
//
// A count, not the file's mtime: a module that imports a changed one must be
// evaluated again although its own file didn't change, and two saves within
// the mtime's resolution would give the same URL, i.e. the old instance.
//
// Modules imported from unversioned ones (the dev server and its own imports:
// the "shell") aren't versioned, so a change to them needs a restart.
// Dependencies are never versioned (see `isOwnModule`).

import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isOwnModule } from "./files.ts";
import { setClaimImport } from "./hot-import.ts";
import { VERSION_PARAM } from "./version.ts";

const versions = new Map<string, number>();
/**
 * For each versioned module, the versioned modules that import it, but for
 * the hot imports': `hotImport` handles changes to those.
 */
const importers = new Map<string, Set<string>>();
const shellPaths = new Set<string>();
// This package's modules are never versioned: the dev server and the app talk
// to each other through them (e.g. `hotImport` keeps its subscriptions in
// one), so they must share one instance. Its root whether this runs from `src`
// or `dist`.
const PACKAGE_FOLDER = fileURLToPath(new URL("../", import.meta.url));
const pathListeners = new Set<(modulePath: string) => void>();

/** The import a `hotImport` makes, while its `load` runs. */
type Claim = {
  resolved: boolean;
  importerUrl: string | undefined;
  modulePath: string | undefined;
  /** Imports made from the same module after the first: there must be none. */
  extraSpecifiers: string[];
};

let claim: Claim | undefined;

const isVersionedParent = (
  parentUrl: string | undefined,
): parentUrl is string =>
  parentUrl?.startsWith("file:") === true &&
  new URL(parentUrl).searchParams.has(VERSION_PARAM);

const notifyNewPath = (modulePath: string) => {
  if (versions.has(modulePath) || shellPaths.has(modulePath)) return;
  for (const listener of pathListeners) {
    listener(modulePath);
  }
};

// Each once: it stays imported from both for as long as the process runs.
const sharedPaths = new Set<string>();
// The shell's instance and the app's are two, which breaks whatever relies on
// there being one (e.g. a React context both use), and only says so by
// misbehaving.
const warnIfShared = (modulePath: string) => {
  if (
    sharedPaths.has(modulePath) ||
    !shellPaths.has(modulePath) ||
    !versions.has(modulePath)
  ) {
    return;
  }
  sharedPaths.add(modulePath);
  console.warn(
    `[hot-reload] ${path.relative(process.cwd(), modulePath)} is imported by both the dev server and the app, so each has its own instance. If it must be one (e.g. a React context), import it only from the app's side, with \`hotImport\`.`,
  );
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    const parentUrl = context.parentURL;

    // While a hot import's `load` runs, the first import resolved is its own:
    // Node resolves an `import()` before it returns. The modules it imports in
    // turn may be resolved before it returns too, but after it, and from it.
    const currentClaim = claim;
    let isClaimed = false;
    if (currentClaim !== undefined) {
      if (!currentClaim.resolved) {
        currentClaim.resolved = true;
        currentClaim.importerUrl = parentUrl;
        isClaimed = true;
      } else if (parentUrl === currentClaim.importerUrl) {
        currentClaim.extraSpecifiers.push(specifier);
      }
    }

    if (!resolved.url.startsWith("file:")) {
      return resolved;
    }

    const url = new URL(resolved.url);
    const modulePath = fileURLToPath(url);
    if (!isOwnModule(modulePath)) {
      return resolved;
    }

    const parentIsVersioned = isVersionedParent(parentUrl);
    if (
      modulePath.startsWith(PACKAGE_FOLDER) ||
      !(parentIsVersioned || isClaimed)
    ) {
      notifyNewPath(modulePath);
      shellPaths.add(modulePath);
      warnIfShared(modulePath);
      return resolved;
    }

    notifyNewPath(modulePath);
    if (!versions.has(modulePath)) {
      versions.set(modulePath, 0);
    }
    warnIfShared(modulePath);
    if (isClaimed && currentClaim !== undefined) {
      currentClaim.modulePath = modulePath;
    } else if (parentIsVersioned) {
      const parentPath = fileURLToPath(parentUrl);
      let moduleImporters = importers.get(modulePath);
      if (moduleImporters === undefined) {
        moduleImporters = new Set();
        importers.set(modulePath, moduleImporters);
      }
      moduleImporters.add(parentPath);
    }

    url.searchParams.set(VERSION_PARAM, String(versions.get(modulePath)));
    return { ...resolved, url: url.href };
  },
});

setClaimImport((load) => {
  const previousClaim = claim;
  const currentClaim: Claim = {
    resolved: false,
    importerUrl: undefined,
    modulePath: undefined,
    extraSpecifiers: [],
  };
  claim = currentClaim;
  let result;
  try {
    result = load();
  } finally {
    claim = previousClaim;
  }

  if (!currentClaim.resolved) {
    throw new Error(
      "hotImport: `load` imported nothing while it ran. It must call `import()` right away: not return a promise it made earlier, nor await anything first.",
    );
  }
  if (currentClaim.extraSpecifiers.length > 0) {
    throw new Error(
      `hotImport: \`load\` imported more than one module (also ${currentClaim.extraSpecifiers.join(", ")}). Give each its own.`,
    );
  }

  const { importerUrl, modulePath } = currentClaim;
  return {
    result,
    modulePath,
    importerPath: importerUrl?.startsWith("file:")
      ? fileURLToPath(importerUrl)
      : undefined,
  };
});

/** Whether the module at `modulePath` was imported from the shell. */
export const isShellModule = (modulePath: string): boolean =>
  shellPaths.has(modulePath);

/** Whether the module at `modulePath` was imported as a versioned module. */
export const isVersionedModule = (modulePath: string): boolean =>
  versions.has(modulePath);

/**
 * The version the next import of the module at `modulePath` gets, if it's
 * versioned.
 */
export const versionOf = (modulePath: string): number | undefined =>
  versions.get(modulePath);

/**
 * Calls `listener` with the path of every module imported so far (versioned or
 * not), and of every one imported later.
 */
export const onModulePath = (listener: (modulePath: string) => void): void => {
  for (const modulePath of new Set([...versions.keys(), ...shellPaths])) {
    listener(modulePath);
  }
  pathListeners.add(listener);
};

/**
 * Bumps the versions of the modules at `modulePaths` and of every module that
 * imports them, directly or not, so importing them again evaluates them again.
 * Stops at hot imports, which have no importers.
 *
 * Returns the modules it bumped.
 */
export const invalidate = (modulePaths: Iterable<string>): Set<string> => {
  const pending = [...modulePaths];
  const bumped = new Set<string>();
  for (let modulePath; (modulePath = pending.pop()) !== undefined; ) {
    if (bumped.has(modulePath)) continue;
    bumped.add(modulePath);
    versions.set(modulePath, (versions.get(modulePath) ?? 0) + 1);
    pending.push(...(importers.get(modulePath) ?? []));
  }
  return bumped;
};
