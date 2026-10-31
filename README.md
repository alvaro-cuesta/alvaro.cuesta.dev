# My personal website

[![Deploy to GitHub Pages](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml)

You are probably interested in one of these packages:

- [@xenon-ssg/core](./xenon-ssg/) — A React static site generator written in TypeScript. It powers this very website!

- [@xenon-ssg/express](./xenon-ssg-express) — Express layer for Xenon SSG. Provides `dev` mode and some reusable plugins
  to have a bit more functionality over the barebones SSG.

- [@xenon-ssg/thunks](./packages/thunks/) — Values you get later: lazy, shared promises, and cells that can be
  invalidated. Not Xenon-specific.

- [alvaro.cuesta.dev](./alvaro.cuesta.dev/) — The actual source code for my website at https://alvaro.cuesta.dev

## License

The code in this repository is © 2024-2026 Álvaro Cuesta, licensed under the
[GNU Affero General Public License, version 3 only](./LICENSE), except for the
website's content (see below).

As section 14 of the license allows, Álvaro Cuesta is the proxy who can decide
whether future versions of the GNU Affero General Public License can be used.

### Website content

The website's content is **not** covered by the license above: it's © 2024-2026
Álvaro Cuesta, all rights reserved. That is:

- Blog posts, in [`alvaro.cuesta.dev/blog/`](./alvaro.cuesta.dev/blog/).
- Timeline entries, in [`alvaro.cuesta.dev/timeline/`](./alvaro.cuesta.dev/timeline/).
- Pages written in MDX, like [Now](./alvaro.cuesta.dev/src/pages/Now.mdx), in
  [`alvaro.cuesta.dev/src/pages/`](./alvaro.cuesta.dev/src/pages/).
- The homepage's text, in
  [`Homepage.tsx`](./alvaro.cuesta.dev/src/pages/Homepage.tsx).
- The site's descriptions (its blurbs), in
  [`config.ts`](./alvaro.cuesta.dev/config.ts).
- Project logos, in [`alvaro.cuesta.dev/static/`](./alvaro.cuesta.dev/static/).

### Third-party content

- The favicon, [`favicon.svg`](./alvaro.cuesta.dev/src/favicon.svg), is
  [Twemoji](https://github.com/jdecked/twemoji)'s 🇦 (© 2019 Twitter,
  Inc and other contributors), recolored. It's licensed under
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
