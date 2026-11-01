import type { Readable } from "node:stream";
import type { UnknownRecord } from "type-fest";
import { type RenderToStreamOptions, renderToStream } from "./render.ts";
import { canonicalizeHref } from "./url.ts";
import { Root } from "./Root.tsx";
import type { LinkProviderProps } from "./generate/LinkContext.tsx";
import { NeedsTrailingSlashError, type XenonRenderFunction } from "./index.ts";

const doNothing = () => {};

export type RenderPageOptions = {
  /**
   * Called with the `href` of every `Link` the page renders, e.g. so the build
   * can crawl them.
   */
  addLink?: LinkProviderProps["addLink"] | undefined;
  /**
   * Where the site is served, if not at the root of its origin (e.g. `/repo`),
   * so `Link`s point there (see `toServedHref`).
   */
  basepath?: LinkProviderProps["basepath"] | undefined;
  renderToStreamOptions?: RenderToStreamOptions | undefined;
};

export type XenonRenderedPage<PageMetadata extends UnknownRecord> =
  | {
      /**
       * Where the page is: the pathname with a trailing slash. A site path,
       * like `pathname`, so whoever serves it there adds the base path.
       */
      redirect: string;
    }
  | {
      /**
       * The page's HTML. Read it right away: until something listens to it, an
       * error it emits crashes the process.
       */
      stream: Readable;
      /**
       * The render function's `metadata`. A rejection only rejects this
       * promise, so whoever doesn't read it can ignore it.
       */
      metadata: Promise<PageMetadata>;
    };

/**
 * Render a page to HTML, the same for whoever serves it, e.g. the build or a
 * dev server: they only decide where the HTML goes.
 *
 * The pathname is made canonical first, so it's the same page whichever way
 * it's written.
 *
 * A {@link NeedsTrailingSlashError} from the render function is a redirect to
 * the pathname with a trailing slash, not an error. Any other error rejects.
 *
 * @param render The site's render function.
 * @param pathname The pathname to render, relative to the root of the site.
 * @returns The page's HTML and metadata, or where to redirect to.
 */
export async function renderPage<PageMetadata extends UnknownRecord>(
  render: XenonRenderFunction<PageMetadata>,
  pathname: string,
  {
    addLink = doNothing,
    basepath = "",
    renderToStreamOptions,
  }: RenderPageOptions = {},
): Promise<XenonRenderedPage<PageMetadata>> {
  const { pathname: canonicalPathname } = canonicalizeHref(pathname);

  let result;
  try {
    result = await render(canonicalPathname);
  } catch (error) {
    if (error instanceof NeedsTrailingSlashError) {
      return { redirect: `${canonicalPathname}/` };
    }
    throw error;
  }

  const metadata = Promise.resolve(result.metadata);
  metadata.catch(doNothing);

  return {
    stream: renderToStream(
      <Root addLink={addLink} basepath={basepath}>
        {result.reactNode}
      </Root>,
      renderToStreamOptions,
    ),
    metadata,
  };
}
