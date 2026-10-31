# Xenon SSG thunks

Values you get later. Not Xenon-specific at all: it's just how Xenon SSG (and the site it powers)
like their values.

A **thunk** is a value you get later: reading it gives you a promise for the value, to `await` or
`use()`. Whether the value is cached, where it comes from, or whether it can change is none of your
business.

Every read gets the same promise until the value changes, so a new promise means a new value. Only
this package makes thunks, so a function that just returns a promise isn't one, and TypeScript won't
take it as one.

- `thunk(make)` runs `make` the first time it's read, and gives every read that same promise.
- `cell(make, subscribe?)` is a thunk that can be invalidated: the next read after that runs `make`
  again. It's for values that come from outside, like files, which only whoever watches them knows
  have changed. `subscribe` starts that watcher on the first read, handing it `invalidate`, and
  disposing the cell stops it.
- `derived(make)` makes its value from other thunks, read through `get`, and runs `make` again once
  any of them gives a new promise. It can't be invalidated: it only changes when what it read does.
- `family(make)` makes thunks one per key, and gives the same one for the same key every time.
  `retain(keys)` drops the rest, disposing the ones that are `Disposable`.

A thunk can't be called. It's read either through `get`, inside a derived thunk's `make`, which
tracks the read, or through `read(thunk)`, which doesn't. `read` is for the edge: code that runs
again every time, and whose result nobody caches, like a request handler or a page render. So every
read says whether anything tracks it.

```ts
const config = cell(
  () => readConfig(CONFIG_PATH),
  (invalidate) => watchInDev(CONFIG_PATH, invalidate),
);

const theme = derived(async (get) => (await get(config)).theme);

const translation = family((language: string) =>
  derived(async (get) => readTranslation((await get(config)).translations, language)),
);

// At the edge.
app.get("/theme", async (req, res) => res.json(await read(theme)));
```

Only what `make` reads through `get` counts. Anything else it reads, like a file, an environment
variable or the time, doesn't make it run again, so a value that can change should be a cell. That
includes code that reads thunks through `read` itself, like components that render: it doesn't
belong in `make` either.

## License

© 2024-2026 Álvaro Cuesta, licensed under the
[GNU Affero General Public License, version 3 only](./LICENSE).

As section 14 of the license allows, Álvaro Cuesta is the proxy who can decide
whether future versions of the GNU Affero General Public License can be used.
