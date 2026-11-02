import { makeRoute } from "./utils/routes.ts";
import { VALID_SLUG_REGEX } from "./utils/slug.ts";

// Param parsers for the routes' `parse`: `undefined` when the param isn't one,
// so the path isn't the route's. They only take what `build` writes, so each
// page has one path.

/**
 * A page past the first, or `null` for the first, which has no page in its
 * path.
 */
const parsePage = (page: string | undefined): number | null | undefined => {
  if (page === undefined) return null;
  // Plainly written, as `toString` does: not e.g. `02` or `2e0`.
  if (!/^[1-9][0-9]*$/.test(page)) return undefined;

  const number = parseInt(page, 10);
  // The first page's path has no page.
  return number > 1 ? number : undefined;
};

const parseYear = (year: string): number | undefined =>
  /^[0-9]{4}$/.test(year) ? parseInt(year, 10) : undefined;

const parseSlug = (slug: string): string | undefined =>
  VALID_SLUG_REGEX.test(slug) ? slug : undefined;

// META PAGES
export const route404 = makeRoute<{}>("/404.html");

// STATIC PAGES
export const routeHome = makeRoute<{}>("/", {
  activePrefix: "/",
  exact: true,
});

export const routeNow = makeRoute<{}>("/now/", { activePrefix: "/now" });

export const routeBookmarks = makeRoute<{}>("/bookmarks/", {
  activePrefix: "/bookmarks",
});

export const routeLicenses = makeRoute<{}>("/licenses/", {
  activePrefix: "/licenses",
});

// BLOG ARTICLES
export const routeBlogArticleList = makeRoute<
  { page?: string },
  { page: number | null }
>(
  "/blog{/page/:page}/",
  (params) => {
    const page = parsePage(params.page);
    return page === undefined ? null : { page };
  },
  (params) => ({
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
  { activePrefix: "/blog" },
);

export const routeBlogArticle = makeRoute<{ slug: string }>(
  `/blog/:slug/`,
  (params) => {
    const slug = parseSlug(params.slug);
    return slug === undefined ? null : { slug };
  },
);

// BLOG TAGS
export const routeBlogTagList = makeRoute<{}>("/blog/tags/");

// Tags aren't checked: they aren't required to be slugs (e.g.
// `series:oh-my-ssh-keys`).
export const routeBlogTag = makeRoute<{ tag: string }>(`/blog/tags/:tag/`);

// BLOG YEARS
export const routeBlogYearList = makeRoute<{}>("/blog/years/");

// TIMELINE
export const routeTimelineList = makeRoute<
  { page?: string },
  { page: number | null }
>(
  "/timeline{/page/:page}/",
  (params) => {
    const page = parsePage(params.page);
    return page === undefined ? null : { page };
  },
  (params) => ({
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
  { activePrefix: "/timeline" },
);

export const routeBlogYear = makeRoute<{ year: string }, { year: number }>(
  "/blog/years/:year/",
  (params) => {
    const year = parseYear(params.year);
    return year === undefined ? null : { year };
  },
  (params) => ({ year: params.year.toString() }),
);

export const routeTimelinePost = makeRoute<{ slug: string }>(
  `/timeline/:slug/`,
  (params) => {
    const slug = parseSlug(params.slug);
    return slug === undefined ? null : { slug };
  },
);

// TIMELINE TAGS
export const routeTimelineTagList = makeRoute<{}>("/timeline/tags/");

export const routeTimelineTag = makeRoute<
  { tag: string; page?: string },
  { tag: string; page: number | null }
>(
  `/timeline/tags/:tag{/:page}/`,
  (params) => {
    const page = parsePage(params.page);
    return page === undefined ? null : { tag: params.tag, page };
  },
  (params) => ({
    tag: params.tag,
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
);

// TIMELINE YEARS
export const routeTimelineYearList = makeRoute<{}>("/timeline/years/");

export const routeTimelineYear = makeRoute<
  { year: string; page?: string },
  { year: number; page: number | null }
>(
  "/timeline/years/:year{/:page}/",
  (params) => {
    const year = parseYear(params.year);
    const page = parsePage(params.page);
    return year === undefined || page === undefined ? null : { year, page };
  },
  (params) => ({
    year: params.year.toString(),
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
);
