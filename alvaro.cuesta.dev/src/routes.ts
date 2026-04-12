import { makeRoute } from "./utils/routes";

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

// BLOG ARTICLES
export const routeBlogArticleList = makeRoute<
  { page?: string },
  { page: number | null }
>(
  // TODO:: path-to-regexp no longer supports complex patterns like `(\\d+)` so we need to find a way to make this work
  "/blog{/page/:page}/",
  (params) => ({
    page: params.page !== undefined ? parseInt(params.page, 10) : null,
  }),
  (params) => ({
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
  { activePrefix: "/blog" },
);

export const routeBlogArticle = makeRoute<{ slug: string }>(
  // TODO:: path-to-regexp no longer supports complex patterns like `(${VALID_SLUG_REGEX_FRAGMENT})` so we need to find a way to make this work
  `/blog/:slug/`,
);

// BLOG TAGS
export const routeBlogTagList = makeRoute<{}>("/blog/tags/");

export const routeBlogTag = makeRoute<{ tag: string }>(
  // TODO:: path-to-regexp no longer supports complex patterns like `(${VALID_SLUG_REGEX_FRAGMENT})` so we need to find a way to make this work
  `/blog/tags/:tag/`,
);

// BLOG YEARS
export const routeBlogYearList = makeRoute<{}>("/blog/years/");

// TIMELINE
export const routeTimelineList = makeRoute<
  { page?: string },
  { page: number | null }
>(
  "/timeline{/page/:page}/",
  (params) => ({
    page: params.page !== undefined ? parseInt(params.page, 10) : null,
  }),
  (params) => ({
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
  { activePrefix: "/timeline" },
);

export const routeBlogYear = makeRoute<{ year: string }, { year: number }>(
  // TODO:: path-to-regexp no longer supports complex patterns like `(\\d{4})` so we need to find a way to make this work
  "/blog/years/:year/",
  (params) => ({ year: parseInt(params.year, 10) }),
  (params) => ({ year: params.year.toString() }),
);

export const routeTimelinePost = makeRoute<{ slug: string }>(
  `/timeline/:slug/`,
);

// TIMELINE TAGS
export const routeTimelineTagList = makeRoute<{}>("/timeline/tags/");

export const routeTimelineTag = makeRoute<
  { tag: string; page?: string },
  { tag: string; page: number | null }
>(
  `/timeline/tags/:tag{/:page}/`,
  (params) => ({
    tag: params.tag,
    page: params.page !== undefined ? parseInt(params.page, 10) : null,
  }),
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
  (params) => ({
    year: parseInt(params.year, 10),
    page: params.page !== undefined ? parseInt(params.page, 10) : null,
  }),
  (params) => ({
    year: params.year.toString(),
    ...(params.page !== null ? { page: params.page.toString() } : {}),
  }),
);
