const FAKE_BASE_URL = new URL(
  "https://www.fakeorigin.if-this-collides-with-a-real-url-im-gonna-be-surprised.example.com",
);

/**
 * Make an href-like string canonical.
 */
export const canonicalizeHref = (
  /**
   * The href-like string to canonicalize.
   */
  url: string,
  /**
   * The base URL to resolve relative URLs. This URL's origin will also be used to determine if the
   * URL is internal or external, i.e. if it points to a different origin.
   */
  baseUrl: URL = FAKE_BASE_URL,
): {
  /** The resolved pathname. */
  pathname: string;
  /** Whether the URL is internal to the base URL. */
  isInternal: boolean;
  /**
   * The URL object.
   *
   * This is useful if you want to pass this URL to other functions that expect a URL object,
   * including this one. This way you can avoid re-parsing the URL.
   */
  pathUrl: URL;
} => {
  const pathUrl = new URL(url, baseUrl);

  return {
    pathname: pathUrl.pathname,
    isInternal: pathUrl.origin === baseUrl.origin,
    pathUrl,
  };
};

/**
 * Where `href` points to once the site is served at `basepath` (e.g. `/repo`,
 * or `""` at the root of its origin).
 *
 * A site path (e.g. `/blog/`) is relative to the site's root, which is
 * `basepath`, not the origin's. Anything else already points where it should
 * wherever the site is served: relative hrefs, and hrefs with their own scheme
 * or host (including `//host/...`).
 */
export const toServedHref = (href: string, basepath: string): string =>
  href.startsWith("/") && !href.startsWith("//") ? `${basepath}${href}` : href;

/**
 * The absolute URL `href` points to, written in the page at site path
 * `pathname` of a site served at `baseUrl` (its origin and base path, as in
 * `https://example.com/repo`), as a browser would resolve it once served.
 *
 * For where only absolute URLs work, e.g. feeds.
 */
export const resolveSiteHref = (
  href: string,
  pathname: string,
  baseUrl: string,
): URL => {
  const base = new URL(baseUrl);
  // `baseUrl` is the origin and the base path joined, so its path is the base
  // path, except that a URL's path is never empty.
  const basepath = base.pathname === "/" ? "" : base.pathname;

  return new URL(
    toServedHref(href, basepath),
    `${base.origin}${toServedHref(pathname, basepath)}`,
  );
};
