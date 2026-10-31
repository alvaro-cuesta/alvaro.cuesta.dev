# Xenon SSG Express

Express layer for [Xenon SSG](../core/) — a dead simple React Static-Site Generator.

Dead simple layer, following the same simplicity philosophy (libraries before frameworks) as [Xenon SSG](../core/).

## Entry point functions

- [Dev mode](./src/dev.ts)
- [Build mode](./src/build.ts)
- [Common](./src/common.ts)

## Plugins

Each one is a package of its own:

- [Static file](../express-plugin-static-file/)
- [Static folder](../express-plugin-static-folder/)
- [Single LightningCSS](../express-plugin-single-lightningcss/)
- [Favicon](../express-plugin-favicon/)
- [Sitemap](../express-plugin-sitemap/)

To write your own, see [`plugin.tsx`](./src/plugin.tsx). Plugins can also use the runtime's
[cache](./src/cache.ts) and [cache busting](./src/cache-busting.ts).

## License

© 2024-2026 Álvaro Cuesta, licensed under the
[GNU Affero General Public License, version 3 only](./LICENSE).

As section 14 of the license allows, Álvaro Cuesta is the proxy who can decide
whether future versions of the GNU Affero General Public License can be used.
