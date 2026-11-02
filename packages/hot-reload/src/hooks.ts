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
/**
 * For each versioned copy, by its URL, the versioned copies it imports, but
 * for the hot imports'.
 */
const copyImports = new Map<string, Set<string>>();
/**
 * For each module that makes hot imports (a copy, by its URL, or a shell
 * module), the copy each of them last loaded, by the imported module's path.
 */
const loadedHotImports = new Map<string, Map<string, string>>();
/**
 * For each module that makes hot imports, the copies they're loading, and how
 * many times: until those settle, they count as in use.
 */
const loadingHotImports = new Map<string, Map<string, number>>();
const settledListeners = new Set<() => void>();
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
  /** The URL of the copy it imports, if it's versioned. */
  moduleUrl: string | undefined;
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

    // It only names the file (see `@xenon-ssg/import-url`), so its importer
    // doesn't depend on what's in it: not versioned, nor counted as an import.
    // `?.`: a `require()` has none, whatever Node's docs and types say.
    // @todo Drop it if Node passes `{}` instead:
    // https://github.com/nodejs/node/issues/67209
    if (context.importAttributes?.["type"] === "url") {
      return resolved;
    }

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
    url.searchParams.set(VERSION_PARAM, String(versions.get(modulePath)));
    if (isClaimed && currentClaim !== undefined) {
      currentClaim.modulePath = modulePath;
      currentClaim.moduleUrl = url.href;
    } else if (parentIsVersioned) {
      const parentPath = fileURLToPath(parentUrl);
      let moduleImporters = importers.get(modulePath);
      if (moduleImporters === undefined) {
        moduleImporters = new Set();
        importers.set(modulePath, moduleImporters);
      }
      moduleImporters.add(parentPath);

      let parentImports = copyImports.get(parentUrl);
      if (parentImports === undefined) {
        parentImports = new Set();
        copyImports.set(parentUrl, parentImports);
      }
      parentImports.add(url.href);
    }

    return { ...resolved, url: url.href };
  },
});

const versionOfUrl = (url: string) =>
  Number(new URL(url).searchParams.get(VERSION_PARAM));

// Counts the copy as in use while it loads, as what it imports may already be
// evaluated, and owning things, then as what the hot import uses once it has.
const trackHotImportLoad = (
  importerUrl: string,
  modulePath: string,
  moduleUrl: string,
  result: unknown,
) => {
  let loading = loadingHotImports.get(importerUrl);
  if (loading === undefined) {
    loading = new Map();
    loadingHotImports.set(importerUrl, loading);
  }
  const importerLoading = loading;
  importerLoading.set(moduleUrl, (importerLoading.get(moduleUrl) ?? 0) + 1);

  const settle = (isLoaded: boolean) => {
    const count = (importerLoading.get(moduleUrl) ?? 1) - 1;
    if (count === 0) {
      importerLoading.delete(moduleUrl);
    } else {
      importerLoading.set(moduleUrl, count);
    }

    if (isLoaded) {
      let loaded = loadedHotImports.get(importerUrl);
      if (loaded === undefined) {
        loaded = new Map();
        loadedHotImports.set(importerUrl, loaded);
      }
      // Not if a newer one settled first: that's the one in use.
      const previousUrl = loaded.get(modulePath);
      if (
        previousUrl === undefined ||
        versionOfUrl(previousUrl) <= versionOfUrl(moduleUrl)
      ) {
        loaded.set(modulePath, moduleUrl);
      }
    }

    for (const listener of settledListeners) {
      listener();
    }
  };
  // A failure is still whoever loads it's to report: the promise they get is
  // the same one.
  Promise.resolve(result).then(
    () => settle(true),
    () => settle(false),
  );
};

setClaimImport((load) => {
  const previousClaim = claim;
  const currentClaim: Claim = {
    resolved: false,
    importerUrl: undefined,
    modulePath: undefined,
    moduleUrl: undefined,
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

  const { importerUrl, modulePath, moduleUrl } = currentClaim;
  if (
    importerUrl !== undefined &&
    modulePath !== undefined &&
    moduleUrl !== undefined
  ) {
    trackHotImportLoad(importerUrl, modulePath, moduleUrl, result);
  }
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
 * Whether the copy at `url` is out of date: a change reached its module since
 * it was imported, so importing the module again gives a newer copy, and
 * nothing gets this one anymore.
 *
 * From the copy's version, rather than from the modules each change reached:
 * that also tells a copy that was out of date already when it was evaluated
 * (e.g. by a load that started before the change), whichever change it was.
 */
export const isOutOfDate = (url: string): boolean => {
  const version = versions.get(fileURLToPath(url));
  return version !== undefined && versionOfUrl(url) < version;
};

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

// The copies the hot imports of the module (or copy) at `importerUrl` use, or
// are loading.
const hotImportsFrom = (importerUrl: string): string[] => [
  ...(loadedHotImports.get(importerUrl)?.values() ?? []),
  ...(loadingHotImports.get(importerUrl)?.keys() ?? []),
];

/**
 * The URLs of the versioned copies in use: those the shell's hot imports use,
 * or are loading, and those they import, directly or not, through hot imports
 * too.
 *
 * Every other copy is out of date, or no longer imported, e.g. after an edit
 * removed its last import, which no change reaches.
 *
 * A hot import counts until a newer copy replaces it, even if what made it is
 * gone: e.g. a post's, after the post is deleted.
 */
export const copiesInUse = (): Set<string> => {
  const inUse = new Set<string>();
  const pending: string[] = [];
  for (const importerUrl of new Set([
    ...loadedHotImports.keys(),
    ...loadingHotImports.keys(),
  ])) {
    if (!isVersionedParent(importerUrl)) {
      pending.push(...hotImportsFrom(importerUrl));
    }
  }
  for (let url; (url = pending.pop()) !== undefined; ) {
    if (inUse.has(url)) continue;
    inUse.add(url);
    pending.push(...(copyImports.get(url) ?? []), ...hotImportsFrom(url));
  }
  return inUse;
};

/**
 * Calls `listener` whenever a hot import settles, i.e. whenever the copies in
 * use (see {@link copiesInUse}) may have changed.
 */
export const onHotImportSettled = (listener: () => void): void => {
  settledListeners.add(listener);
};

/** A module, as {@link moduleGraph} describes it. */
export type ModuleGraphModule = {
  path: string;
  /** Whether the shell imports it (so it isn't reloaded), or the app does. */
  kind: "shell" | "app" | "both";
  /** The version the next import of it gets, if it's the app's. */
  version: number | undefined;
  /** The app's modules that import it, but for its hot imports. */
  importers: string[];
};

/** A copy of a module, as {@link moduleGraph} describes it. */
export type ModuleGraphCopy = {
  url: string;
  inUse: boolean;
  /** The copies it imports, but for its hot imports'. */
  imports: string[];
  /** The copies its hot imports use, or are loading. */
  hotImports: string[];
};

/**
 * For debugging: every module the app or the shell imported, and every copy of
 * the app's that hasn't been forgotten (they never are).
 */
export const moduleGraph = (): {
  modules: ModuleGraphModule[];
  copies: ModuleGraphCopy[];
} => {
  const inUse = copiesInUse();
  const modulePaths = new Set([...shellPaths, ...versions.keys()]);
  const importerUrls = [
    ...loadedHotImports.keys(),
    ...loadingHotImports.keys(),
  ];
  const copyUrls = new Set([
    ...copyImports.keys(),
    ...[...copyImports.values()].flatMap((urls) => [...urls]),
    ...importerUrls.filter(isVersionedParent),
    ...importerUrls.flatMap(hotImportsFrom),
  ]);

  return {
    modules: [...modulePaths].sort().map((modulePath) => {
      const isShell = shellPaths.has(modulePath);
      const isApp = versions.has(modulePath);
      return {
        path: modulePath,
        kind: isShell ? (isApp ? "both" : "shell") : "app",
        version: versions.get(modulePath),
        importers: [...(importers.get(modulePath) ?? [])].sort(),
      };
    }),
    copies: [...copyUrls].sort().map((url) => ({
      url,
      inUse: inUse.has(url),
      imports: [...(copyImports.get(url) ?? [])].sort(),
      hotImports: hotImportsFrom(url).sort(),
    })),
  };
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
