# Xenon SSG

I was tired of overengineered solutions for React SSG so I went and did my own, dead simple,
React-powered Static Site Generator.

Yes. Another one. **But this one's cooler**, trust me.

Jump straight to the [minimal examples](#minimal-examples) and make sure to read about the
[caveats](#caveats) of Xenon SSG.

## Philosophy

The idea of Xenon SSG is to be as small and lightweight as possible: think of Xenon SSG as a
**library**, instead of a framework. It is **batteries excluded** so you will have to bring your own
bundler/runner... and that's a good thing!

Do you like GraphQL? CSS modules? Or maybe you actually hate them? It doesn't matter. I don't care.
**Bring your own toolbox and finally have fun doing what you want!**\*

_\*fun not guaranteed._

## What Xenon SSG is not

Xenon SSG is not...

- ...a framework.
- ...client-side enabled. Like, at all.
- ...going to support dynamic Server-Side Rendering.
- ...a princess. That's in another castle.
- ...going to explode. Hopefully.

## Minimal examples

This cute snippet...

```tsx
const App: React.FC<{ pathname: string }> = ({ pathname }) =>
  <html lang="en">
    <head>
      <title>Hello from Xenon SSG!</title>
    </head>
    <body>
      You are visiting <code>{pathname}</code>.
      You can also go to <Link href="/about">the about page</Link>.
    </body>
  </html>

generateStaticSite(
  (pathname) => <App pathname={pathname} />,
  {
    entryPaths: ["/", "/blog/", "/blog/some-slug", "/404.html"],
  }
);
```

...will generate files in `/index.html`, `/blog/index.html`, `/blog/some-slug/.html`, etc. ready to
be deployed statically to any static host such as GitHub Pages or a Raspberry Pi in your basement.

But... what's **EVEN cooler**, it will also generate `/about/index.html` automatically for you,
even if you didn't specify that route. Any links that use `Link` will be **automatically crawled**
and statically generated for you!

But what's the fun in generating your whole website during development? Ugh. That's like, so 90s.
Wait, Xenon's got you covered!

```tsx
const app = express();

app.use(express.static('./public')); // <- optional if you don't need to serve CSS or images
app.use(makeXenonMiddleware((pathname) =>
  <App pathname={pathname} />,
));

app.listen(PORT, () => {
  console.log(`Xenon SSG listening on port ${PORT}`);
});
```

## Caveats

This is **purely a static-site generator**. It means it has no capabilities to actually perform any
client-side interactivity and any usage of `useEffect`, `useState` (or, in general, anything that
requires client-side hydration) will **not work**.

As of right now you can use other tools like [Vike](https://vike.dev/) to perform SSG while still
retaining some sort of client-side bundling capabilities. This comes with a downside though: since
RSC are not yet supported in Vite, there is no way to omit the server-only components from the
client bundle, so you will pay the price of bundling and downloading the whole application, having
to hydrate, etc. **Me no likey.**

I still think this is a **good thing** though: this will force you to build a truly static or
almost-static website. You can sprinkle some simple interactivity via JavaScript (yay, 1999!) or,
even better, stick to CSS and platform-native only solutions that will work without any client-side
JS being involved at all.

Do you need an accordion? Use `<summary>`. Do you need to highlight a heading when it's a target
of the URL hash? Use `:target`.

If you need additonal power, Xenon SSG is not the tool you need.

> _As a side note, this is why Xenon SSG is called Xenon. Because it's unreactive. Heh :)_

## Advanced usage

**(TODO)** Just read the repo for now.

## Future features

- [ ] Bundling the damn thing

  Currently Xenon SSG is for my own usage and I'm not even bundling it as a library. It's just a
  bunch of TypeScript that nobody but me will use... for now!

  Expect this to become an actual
  library at some point.

- [ ] Tests

  Who doesn't like tests? I do. But I also like getting this into a usable state first.

- [ ] Linting

  Same.

- [ ] [React Server Components](https://react.dev/reference/rsc/server-components)

  Although the model is very close I will not work on this yet, since they are pretty much private
  to the React and Next.js team. They is also only supported in Webpack (as I'm writing this) and I
  want to keep this as a lightweight library.

  Would be nice to have `async` components though!

- [ ] Client-side interactivity

  Refer to the React Server Components feature above. I'm open to allowing some interactivity but
  it will have to be secondary to the SSG nature of Xenon SSG.

## License

© 2024-2026 Álvaro Cuesta, licensed under the
[GNU Affero General Public License, version 3 only](./LICENSE).

As section 14 of the license allows, Álvaro Cuesta is the proxy who can decide
whether future versions of the GNU Affero General Public License can be used.
