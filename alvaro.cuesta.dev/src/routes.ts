import { makeRoute } from "./utils/routes";

export const routeHome = makeRoute<{}>("/");

export const route404 = makeRoute<{}>("/404.html");

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

export const routeBlogYear = makeRoute<{ year: string }, { year: number }>(
  // TODO:: path-to-regexp no longer supports complex patterns like `(\\d{4})` so we need to find a way to make this work
  "/blog/years/:year/",
  (params) => ({ year: parseInt(params.year, 10) }),
  (params) => ({ year: params.year.toString() }),
);
