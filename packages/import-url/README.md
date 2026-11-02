# Xenon SSG URL imports

Import a file's URL instead of its module:

```ts
import post from "./post.mdx" with { type: "url" };
```

`post` is the file's `file:` URL, as a `FileUrl`. The file isn't loaded, so whatever is made from it
can all start from it at once: e.g. its module (`import(post.href)`) and its git dates. The path is
written once, and a file that doesn't exist fails the import, like any other.

- `@xenon-ssg/import-url/hooks` adds these imports to Node. Pass it with `--import` after the
  loaders of the files it names (e.g. one for `.mdx`), so it answers before them, e.g. in Node's
  config file.
- `@xenon-ssg/import-url/types` types them for TypeScript (from 7.1, which types imports by their
  attributes): a `FileUrl` of an `unknown` module.
- `toFileUrl(url)` is a `FileUrl` for a file known only at runtime, e.g. one a folder lists.

`FileUrl<Module>` also carries what importing it gives, in its type only. To say more than
`unknown`, declare the files' kind before `@xenon-ssg/import-url/types`:

```ts
declare module "*.mdx" with { type: "url" } {
  const file: import("@xenon-ssg/import-url").FileUrl<MdxModule>;
  export default file;
}
```

A declaration only types a kind of file, not each file by its own module: TypeScript can't refer to
the module a pattern matched ([microsoft/TypeScript#65109](https://github.com/microsoft/TypeScript/issues/65109)).
Until it can, `withModule` says it, by repeating the path in a type (which doesn't load the module),
and unchecked:

```ts
import post from "./post.mdx" with { type: "url" };

const typedPost = withModule<typeof import("./post.mdx")>(post);
```

A file isn't a dependency of the module that names it: with `@xenon-ssg/hot-reload`, editing it
doesn't evaluate that module again. Whatever loads it from its URL handles that (e.g. a hot import).
