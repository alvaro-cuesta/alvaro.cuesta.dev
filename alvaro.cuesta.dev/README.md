# https://alvaro.cuesta.dev

[![Deploy to GitHub Pages](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml/badge.svg)](https://github.com/alvaro-cuesta/alvaro.cuesta.dev/actions/workflows/deploy.yml)

## TODO

- Maybe use FontAwesome React packages? Or my own icon but ensure it behaves the same (I think their
  components renders SVG instead of fonts)
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
- Migrate somwhere else: GitHub Pages do not allow custom cache times (hardcoded to 600s!), and we could even be serving `immutable` for assets
- Latest blog posts in frontpage
- Proper router
- Sitemap improvements
  - Add last modified that I am already injecting in `<meta>` tags
  - Add last modified to feeds? Inferred from latest post last-modified
  - Add priority to feeds?
- Better way to inject metadata for sitemap plugin
  - The page, and not the `render` function, should set its own metadata
  - Maybe use global React.Context? Or even per-plugin Context?
- Better way to emit URLs to sitemap
  - Currently hardcoded via `feeds.getFeedSitemapPathnames`
  - But maybe there's a way via hooks in plugins?
