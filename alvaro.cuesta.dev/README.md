# https://alvaro.cuesta.dev

[![Deploy to GitHub Pages](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml)

## TODO

### Refactors

- Maybe use FontAwesome React packages? Or my own icon but ensure it behaves the same (I think their components renders SVG instead of fonts)
- Proper router? This ties with the path-as-data work.
- Better way to inject metadata for sitemap plugin
  - The page, and not the `render` function, should set its own metadata?
  - Maybe use global React.Context? Or even per-plugin Context?
- Better way to emit URLs to sitemap
  - Currently hardcoded via `feeds.getFeedSitemapPathnames`
  - But maybe there's a way via hooks in plugins?
- Should we prepare or even move to RSC?
  - This would eventually allow us to have isolated islands of interactivity within the static site, without bloating the whole page with unnecessary JavaScript for the non-interactive parts.
  - Problems I foresee:
    - This might not work well with automated discovery: RSC needs static discovery I think becuase IIUC it needs to know in advance what goes into the RSC common bundle and what doesn't, so this is a circular dependency.
    - We have to change the architecture. For example, Link won't work with RSC since it relies on React Context which I think is not available in RSCs. Also I'm not sure how async components and RSC tie together.
- Could we take more modules out of site into reusable packages? E.g. the worker thing might be interesting to keep separate from MDX, or MDX could itself be a plugin of sorts, or content-file/content-loader, or the Git stuff, or the globs, or...
  - But they should remain independently configurable so that they don't carry site-specific assumptions or dependencies -- they should always be self-contained

### Features

- Pinned/featured posts in frontpage (or timeline posts, or both?)
- Latest blog posts in frontpage (or timeline posts, or both?)
- Wiki
- Sitemap improvements
  - Add last modified that I am already injecting in `<meta>` tags
  - Add last modified to feeds? Inferred from latest post last-modified
  - Add priority to feeds?
- Blog posts
  - Comments from GH issues?
  - Add reading time https://github.com/rehypejs/rehype-infer-reading-time-meta
  - Add autoembed
    - https://github.com/PaulieScanlon/mdx-embed
    - https://mdxjs.com/guides/embed/
  - Extract to mdx and blog packages
  - Can we infer OG embed image from first image in MDX?
- `ld+json` (e.g. a `BlogPosting`)
  ```
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "My Article Title",
    "datePublished": "2025-08-25T12:00:00Z",
    "dateModified": "2025-08-26T09:00:00Z"
  }
  </script>
  ```

### Infrastructure

- Migrate somwhere else: GitHub Pages do not allow custom cache times (hardcoded to 600s!), and we could even be serving `immutable` for assets
  - E.g., migrate to S3

### Style

- Big (decorative) image next to blog and timeline header blurbs
- Favicons are ugly
- Lists are ugly
- Pico.css is ugly

## License

The code is licensed under the [AGPL 3.0](../LICENSE) only, but the content
(blog posts, timeline entries, pages' text and logos) is all rights reserved,
and the favicon is Twemoji's (CC-BY 4.0). See the
[repository's README](../README.md#license) for details.
