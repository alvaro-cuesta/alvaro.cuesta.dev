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
