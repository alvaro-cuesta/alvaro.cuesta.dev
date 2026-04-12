import path from "node:path";
import type { FeedFormat, FeedFormatRoute } from "./types";

export const DEFAULT_MOUNT_POINT_FRAGMENTS: string[] = [];

export const FEED_FORMATS: Record<
  FeedFormat,
  { basename: string; extension: string; contentType: string }
> = {
  jsonfeed: {
    basename: "feed",
    extension: ".json",
    contentType: "application/feed+json; charset=utf-8",
  },
  atom: {
    basename: "atom",
    extension: ".xml",
    contentType: "application/atom+xml; charset=utf-8",
  },
  rss: {
    basename: "feed",
    extension: ".rss",
    contentType: "application/rss+xml; charset=utf-8",
  },
};

export const ALL_FEED_FORMATS: readonly FeedFormat[] = [
  "rss",
  "jsonfeed",
  "atom",
];

const PAGE_PARAM_PATTERN = "\\d+";

/** Build an absolute URL from a site base URL and pathname. */
export function toAbsoluteUrl(baseUrl: string, pathname: string): string {
  return `${baseUrl}${pathname}`;
}

/** Resolve a feed format route to an absolute URL. */
export function getRouteUrl(baseUrl: string, route: FeedFormatRoute): string {
  return toAbsoluteUrl(baseUrl, route.pathname);
}

function getFeedPathFragments(
  mountPointFragments: string[],
  page: number,
  format: FeedFormat,
): string[] {
  const { basename, extension } = FEED_FORMATS[format];
  const filename =
    page === 1
      ? `${basename}${extension}`
      : `${basename}-page${page}${extension}`;

  return [...mountPointFragments, filename];
}

/**
 * Build the pathname/output path/content type tuple for a feed format and page.
 */
export function getFeedFormatRoute(
  mountPointFragments: string[],
  page: number,
  format: FeedFormat,
): FeedFormatRoute {
  const { contentType } = FEED_FORMATS[format];
  const fragments = getFeedPathFragments(mountPointFragments, page, format);

  return {
    pathname: `/${fragments.join("/")}`,
    outputRelativePath: path.join(...fragments),
    contentType,
  };
}

/**
 * Build the Express pathname pattern for paginated feed documents of a format.
 */
export function getPaginatedFeedFormatRoutePath(
  mountPointFragments: string[],
  format: FeedFormat,
): string {
  const { basename, extension } = FEED_FORMATS[format];

  return `/${[
    ...mountPointFragments,
    `${basename}-page:page(${PAGE_PARAM_PATTERN})${extension}`,
  ].join("/")}`;
}

/**
 * Build all discoverable feed pathnames to be included in the sitemap.
 */
export function getFeedSitemapPathnames(
  totalPages: number,
  mountPointFragments = DEFAULT_MOUNT_POINT_FRAGMENTS,
  formats: readonly FeedFormat[] = ALL_FEED_FORMATS,
): string[] {
  return Array.from(
    { length: totalPages },
    (_value, index) => index + 1,
  ).flatMap((page) => {
    return formats.map((format) => {
      return getFeedFormatRoute(mountPointFragments, page, format).pathname;
    });
  });
}
