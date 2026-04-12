import { type RenderToStreamOptions, renderToFileAtomic } from "../render";
import path from "node:path";
import fs from "node:fs/promises";
import { mapIter } from "../iter";
import { canonicalizeHref } from "../url";
import { Root } from "../Root";
import type { XenonRenderFunction } from "..";
import type { UnknownRecord } from "type-fest";

const FAKE_BASE_URL =
  "https://www.fakeorigin.if-this-collides-with-a-real-url-im-gonna-be-surprised.example.com";

type GenerateStaticSiteOptions = {
  /**
   * The entry pathnames to render.
   *
   * - They will be rendered in the order they are provided.
   *
   * - Pathnames will be deduplicated.
   *
   * - If a pathname ends in `.html`, it will be rendered as that file.
   *
   *   E.g. `/foo.html` -> `/foo.html`
   *
   * - If a pathname is a directory, it will be rendered as `index.html` inside that directory.
   *   Directories end with `/`, but we also assume that any paths that don't end with `/` are
   *   directories and they are just missing the trailing `/`.
   *
   *   E.g. (`/foo/` -> `/foo/index.html`) or (`/foo` -> `/foo/index.html`)
   */
  entryPaths?: Iterable<string>;
  /**
   * The directory where the static site will be generated.
   */
  outputDir?: string;
  /**
   * Options for the `renderToStream` function.
   */
  renderToStreamOptions?: RenderToStreamOptions;
  /**
   * Pathnames that the link crawler should ignore. Use this for paths that
   * are emitted as static files by some other system (e.g. feed plugins,
   * sitemaps) and therefore must not be queued for React rendering.
   *
   * Pathnames are canonicalized with the same rules as crawled links.
   */
  ignoredPathnames?: Iterable<string>;
};

export type XenonGeneratedPage<PageMetadata> = {
  pathname: string;
  metadata: PageMetadata;
};

export async function generateStaticSite<PageMetadata extends UnknownRecord>(
  /**
   * Function that returns a React node.
   *
   * The function will be called with the `pathname` to render, relative to the root of the site.
   */
  renderFn: XenonRenderFunction<PageMetadata>,
  {
    entryPaths = ["/"],
    outputDir = path.join(process.cwd(), "dist"),
    renderToStreamOptions,
    ignoredPathnames = [],
  }: GenerateStaticSiteOptions = {},
): Promise<XenonGeneratedPage<PageMetadata>[]> {
  const generatedPages: XenonGeneratedPage<PageMetadata>[] = [];

  // We have to make sure we turn the pathnames into canonical and absolute paths so that
  // duplicate detection works.
  //
  // E.g. ('' -> '/') or ('something/../foo/bar' -> '/foo/bar')
  const canonicalizePathname = (pathname: string) =>
    new URL(pathname, FAKE_BASE_URL).pathname;

  const pendingRenderPathnames = new Set(
    mapIter(entryPaths, canonicalizePathname),
  );
  // Pre-seed visited with both the entry paths and the plugin-declared
  // static pathnames. Static pathnames (e.g. feed documents) are emitted by
  // other systems, so the crawler should treat them as already-handled and
  // skip them — no need for a separate ignore set.
  const visitedPathnames = new Set([
    ...pendingRenderPathnames,
    ...mapIter(ignoredPathnames, canonicalizePathname),
  ]);

  while (pendingRenderPathnames.size > 0) {
    // `as` is safe because we know this is not `undefined` because of the `while` condition
    const rawPathname = pendingRenderPathnames.values().next().value as string;
    pendingRenderPathnames.delete(rawPathname);
    const { pathname, pathUrl, isInternal } = canonicalizeHref(rawPathname);

    if (!isInternal) {
      throw new Error(
        `The path ${rawPathname} is not an internal link. Links to external origins are not allowed.`,
      );
    }

    // TODO: Allow other file extensions?
    const filepath = pathname.endsWith(".html")
      ? pathname
      : pathname.endsWith("/")
        ? `${pathname}index.html`
        : `${pathname}/index.html`;
    const fullFilePath = path.join(outputDir, filepath);
    const fullFilePathDir = path.dirname(fullFilePath);

    console.debug(`[Rendering] ${pathname}
  ${fullFilePath}`);

    await fs.mkdir(fullFilePathDir, { recursive: true });

    const addLink = (href: string) => {
      const { pathname: linkPathname, isInternal: linkIsInternal } =
        canonicalizeHref(href, pathUrl);

      if (
        // Ignore external links
        !linkIsInternal ||
        // Ignore links to already-visited pages, including the plugin-
        // declared static pathnames pre-seeded into `visitedPathnames`.
        visitedPathnames.has(linkPathname)
      ) {
        return;
      }

      visitedPathnames.add(linkPathname);
      pendingRenderPathnames.add(linkPathname);
    };

    const { reactNode, metadata } = renderFn(pathname);

    await renderToFileAtomic(
      fullFilePath,
      <Root addLink={addLink}>{reactNode}</Root>,
      renderToStreamOptions,
    );

    generatedPages.push({
      pathname,
      metadata,
    });
  }

  return generatedPages;
}
