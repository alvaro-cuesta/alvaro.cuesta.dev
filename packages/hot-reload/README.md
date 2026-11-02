# Xenon SSG hot reload

Reload a Node app's changed modules in place, without restarting the process. Not Xenon-specific:
it's how `@xenon-ssg/express`'s dev server reloads the site.

Node never evaluates a module twice, so this versions them: `@xenon-ssg/hot-reload/hooks` adds a
`?v=N` to the URL of every module the app imports, and bumps it when the module, or anything it
imports, changes. Importing the app again then evaluates only what changed and what imports it.
Everything else keeps its instance, and its state.

- `@xenon-ssg/hot-reload` is for both the dev server and the app:
  - `hotImport(() => import("./x.ts"))` imports a module through a function, and tells its
    subscribers when it changes, for them to load it again. A change stops there: the module the
    `import()` is written in isn't evaluated again, nor are its importers. The dev server loads the
    app this way, and the app can keep a change from reaching it the same way: e.g. a list of posts
    that imports each with its own. Its `load` and `subscribe` fit a cell (see
    `@xenon-ssg/thunks`).
  - `watchInDev(path, onChange)` calls `onChange` when a file or folder that isn't a module changes,
    e.g. a config file the app reads. Also fits a cell's subscription.
  - `moduleStack(import.meta)` is a `DisposableStack` for what a copy of a module owns, e.g. the
    thunks it makes at its top level. Once a change evaluates the module again, the dev server
    disposes the old copy's, as soon as nothing uses it.
- `@xenon-ssg/hot-reload/supervisor` runs the dev server, and restarts it when what can't be
  reloaded changes. `superviseDevServer({ serve })` runs the calling script again in a child process
  with the hooks, like `node:cluster`, where it calls `serve`, and restarts it when its own modules
  change. `restartDevServer(reason)` asks for a restart. For modules Node loaded before the hooks
  (e.g. a loader in its config file), `restartOnChangeInDev(paths)` restarts it when they change.
  For a worker's, `restartOnWorkerChangeInDev(worker)` does, once the worker calls
  `reportImportsInDev()`.
- `@xenon-ssg/hot-reload/reload` is for the dev server. `watchForReload(onRetire)` watches what the
  app imports, calls the subscribers of the hot imports each change reaches, and then hands
  `onRetire` the stacks of the copies the change replaced, to dispose once nothing uses them.

Outside the dev server (in production, or in tests), nothing is versioned: `hotImport` just imports,
`watchInDev` does nothing, and module stacks are never disposed.

A module's state must come from nothing but its imports, and from cells that watch anything else it
reads, e.g. with `watchInDev`. What it owns goes in its `moduleStack`, or it outlives the copy that
made it. See `watchForReload` for the details.

`hotImport` relies on something Node doesn't document: that it resolves an `import()` before the
call that makes it returns. That's how the hooks tell which module a `hotImport` imported. If Node
ever stops doing it, `hotImport` fails as it loads, rather than serving stale modules
(`hooks.test.ts` checks it).

The dev server and the app don't share modules: one imported by both gets an instance for each, and
only the app's is versioned. So whatever must be one (e.g. a React context both use) must be
imported from the app's side, with `hotImport`, or come from a dependency, which is never versioned.
