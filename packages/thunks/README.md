# Xenon SSG thunks

Values you get later. Not Xenon-specific at all: it's just how Xenon SSG (and the site it powers)
like their values.

A **thunk** is a function that gives you a promise for a value: `() => Promise<T>`. Call it, and
`await` or `use()` what it gives you. Whether the value is cached, where it comes from, or whether it
can change is none of your business.

- `thunk(make)` runs `make` the first time it's called, and gives every call that same promise.
- `cell(make)` is a thunk that can be invalidated: the next call after that runs `make` again.

```ts
const config = cell(() => readConfig(CONFIG_PATH));
watchInDev(CONFIG_PATH, () => config.invalidate());

// Consumers only see a thunk.
export const getConfig: Thunk<Config> = config;
```

## License

© 2024-2026 Álvaro Cuesta, licensed under the
[GNU Affero General Public License, version 3 only](./LICENSE).

As section 14 of the license allows, Álvaro Cuesta is the proxy who can decide
whether future versions of the GNU Affero General Public License can be used.
