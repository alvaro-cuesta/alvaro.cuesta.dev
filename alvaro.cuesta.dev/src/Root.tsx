import type { ReactNode } from "react";
import type { SiteRenderMeta } from "./site.tsx";
import {
  route404,
  routeBlogArticle,
  routeBlogArticleList,
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
  routeHome,
  routeTimelinePost,
  routeTimelineList,
  routeTimelineTag,
  routeTimelineTagList,
  routeTimelineYear,
  routeTimelineYearList,
  routeNow,
  routeBookmarks,
  routeLicenses,
} from "./routes.ts";
import { BlogArticle } from "./pages/blog/BlogArticle.tsx";
import { BlogArticleList } from "./pages/blog/BlogArticleList.tsx";
import { BlogTag } from "./pages/blog/BlogTag.tsx";
import { BlogTagList } from "./pages/blog/BlogTagsList.tsx";
import { BlogYear } from "./pages/blog/BlogYear.tsx";
import { BlogYearList } from "./pages/blog/BlogYearList.tsx";
import { Homepage } from "./pages/Homepage.tsx";
import { TimelinePostPage } from "./pages/timeline/TimelinePost.tsx";
import { TimelineList } from "./pages/timeline/TimelineList.tsx";
import { TimelineTag } from "./pages/timeline/TimelineTag.tsx";
import { TimelineTagList } from "./pages/timeline/TimelineTagList.tsx";
import { TimelineYear } from "./pages/timeline/TimelineYear.tsx";
import { TimelineYearList } from "./pages/timeline/TimelineYearList.tsx";
import { NotFound } from "./pages/NotFound.tsx";
import { makeMdxPage } from "./components/molecules/MdxPage.tsx";
import { getBlogItem } from "./blog/promise.ts";
import { getTimelineItem } from "./timeline/promise.ts";
import {
  instantToBlogItemDate,
  type BlogItemDate,
} from "./utils/item-dates.ts";

const Now = makeMdxPage(import.meta.resolve("./pages/Now.mdx"));
const Bookmarks = makeMdxPage(import.meta.resolve("./pages/Bookmarks.mdx"));
const Licenses = makeMdxPage(import.meta.resolve("./pages/Licenses.mdx"));

/**
 * When a page was published and last modified, for its meta tags and the sitemap.
 *
 * A date the page doesn't have is left out.
 */
export type PageDates = {
  published?: BlogItemDate | undefined;
  modified?: BlogItemDate | undefined;
};

const getItemPageDates = (module: {
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
}): PageDates => ({
  published: module.publicationDate,
  modified: module.lastModificationDate ?? undefined,
});

const getMdxPageDates = async (
  mdxPage: ReturnType<typeof makeMdxPage>,
): Promise<PageDates> => ({
  modified: instantToBlogItemDate(await mdxPage.getLastUpdated()),
});

/**
 * Sitemap priorities, by the kind of page.
 *
 * They only mean something relative to each other.
 */
const SITEMAP_PRIORITY = {
  home: 1.0,
  /** Like Now. */
  highSignal: 0.9,
  blogArticle: 0.85,
  timelinePost: 0.8,
  /** The first page of the blog or the timeline. */
  frontpage: 0.7,
  /** Tag and year lists, and the first page of each tag or year. */
  genericRoute: 0.3,
  /** Any page of a paginated list after the first. */
  pagination: 0.2,
} as const;

/**
 * The sitemap priority of a page of a paginated list.
 *
 * The first page gets `firstPagePriority`, and the rest `SITEMAP_PRIORITY.pagination`.
 */
const getPaginatedSitemapPriority = (
  page: number | null,
  firstPagePriority: number,
): number =>
  page === null || page <= 1 ? firstPagePriority : SITEMAP_PRIORITY.pagination;

/**
 * Everything that depends on which page a pathname is.
 *
 * Deciding it all in one place means none of it can disagree, e.g. by matching routes in a different order
 * (`/blog/:slug/` also matches `/blog/tags/`).
 */
export type ResolvedPage = {
  render: (siteRenderMeta: SiteRenderMeta) => ReactNode;
  /**
   * When the page was published and last modified, for its meta tags and the sitemap.
   *
   * Left out when the page has no dates.
   */
  dates?: Promise<PageDates>;
} & (
  | {
      /**
       * Keeps the page out of search engines.
       *
       * It gets a `noindex` meta tag, and is left out of the sitemap, so it has no sitemap entry.
       */
      noindex: true;
      sitemap?: never;
    }
  | {
      noindex?: never;
      sitemap: { priority?: number };
    }
);

export async function resolvePage(pathname: string): Promise<ResolvedPage> {
  if (routeHome.match(pathname)) {
    return {
      render: (siteRenderMeta) => <Homepage siteRenderMeta={siteRenderMeta} />,
      sitemap: { priority: SITEMAP_PRIORITY.home },
    };
  }

  if (route404.match(pathname)) {
    return {
      render: (siteRenderMeta) => <NotFound siteRenderMeta={siteRenderMeta} />,
      noindex: true,
    };
  }

  if (routeNow.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <Now.Component siteRenderMeta={siteRenderMeta} />
      ),
      dates: getMdxPageDates(Now),
      sitemap: { priority: SITEMAP_PRIORITY.highSignal },
    };
  }

  if (routeBookmarks.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <Bookmarks.Component siteRenderMeta={siteRenderMeta} />
      ),
      dates: getMdxPageDates(Bookmarks),
      sitemap: {},
    };
  }

  if (routeLicenses.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <Licenses.Component siteRenderMeta={siteRenderMeta} />
      ),
      dates: getMdxPageDates(Licenses),
      sitemap: {},
    };
  }

  const routeTimelineListMatch = routeTimelineList.match(pathname);
  if (routeTimelineListMatch) {
    return {
      render: (siteRenderMeta) => (
        <TimelineList
          siteRenderMeta={siteRenderMeta}
          page={routeTimelineListMatch.page}
        />
      ),
      sitemap: {
        priority: getPaginatedSitemapPriority(
          routeTimelineListMatch.page,
          SITEMAP_PRIORITY.frontpage,
        ),
      },
    };
  }

  if (routeTimelineTagList.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <TimelineTagList siteRenderMeta={siteRenderMeta} />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  const routeTimelineTagMatch = routeTimelineTag.match(pathname);
  if (routeTimelineTagMatch) {
    return {
      render: (siteRenderMeta) => (
        <TimelineTag
          siteRenderMeta={siteRenderMeta}
          tag={routeTimelineTagMatch.tag}
          page={routeTimelineTagMatch.page}
        />
      ),
      sitemap: {
        priority: getPaginatedSitemapPriority(
          routeTimelineTagMatch.page,
          SITEMAP_PRIORITY.genericRoute,
        ),
      },
    };
  }

  if (routeTimelineYearList.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <TimelineYearList siteRenderMeta={siteRenderMeta} />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  const routeTimelineYearMatch = routeTimelineYear.match(pathname);
  if (routeTimelineYearMatch) {
    return {
      render: (siteRenderMeta) => (
        <TimelineYear
          siteRenderMeta={siteRenderMeta}
          year={routeTimelineYearMatch.year}
          page={routeTimelineYearMatch.page}
        />
      ),
      sitemap: {
        priority: getPaginatedSitemapPriority(
          routeTimelineYearMatch.page,
          SITEMAP_PRIORITY.genericRoute,
        ),
      },
    };
  }

  const routeTimelinePostMatch = routeTimelinePost.match(pathname);
  if (routeTimelinePostMatch) {
    const post = getTimelineItem(routeTimelinePostMatch.slug)();

    return {
      render: (siteRenderMeta) => (
        <TimelinePostPage
          siteRenderMeta={siteRenderMeta}
          post={post}
        />
      ),
      dates: post.then((post) => getItemPageDates(post.module)),
      sitemap: { priority: SITEMAP_PRIORITY.timelinePost },
    };
  }

  const routeBlogPageMatch = routeBlogArticleList.match(pathname);
  if (routeBlogPageMatch) {
    return {
      render: (siteRenderMeta) => (
        <BlogArticleList
          siteRenderMeta={siteRenderMeta}
          page={routeBlogPageMatch.page}
        />
      ),
      sitemap: {
        priority: getPaginatedSitemapPriority(
          routeBlogPageMatch.page,
          SITEMAP_PRIORITY.frontpage,
        ),
      },
    };
  }

  if (routeBlogTagList.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <BlogTagList siteRenderMeta={siteRenderMeta} />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  const routeBlogTagMatch = routeBlogTag.match(pathname);
  if (routeBlogTagMatch) {
    return {
      render: (siteRenderMeta) => (
        <BlogTag siteRenderMeta={siteRenderMeta} tag={routeBlogTagMatch.tag} />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  if (routeBlogYearList.match(pathname)) {
    return {
      render: (siteRenderMeta) => (
        <BlogYearList siteRenderMeta={siteRenderMeta} />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  const routeBlogYearMatch = routeBlogYear.match(pathname);
  if (routeBlogYearMatch) {
    return {
      render: (siteRenderMeta) => (
        <BlogYear
          siteRenderMeta={siteRenderMeta}
          year={routeBlogYearMatch.year}
        />
      ),
      sitemap: { priority: SITEMAP_PRIORITY.genericRoute },
    };
  }

  const routeBlogArticleMatch = routeBlogArticle.match(pathname);
  if (routeBlogArticleMatch) {
    const article = getBlogItem(routeBlogArticleMatch.slug)();

    return {
      render: (siteRenderMeta) => (
        <BlogArticle
          siteRenderMeta={siteRenderMeta}
          article={article}
        />
      ),
      dates: article.then((article) => getItemPageDates(article.module)),
      sitemap: { priority: SITEMAP_PRIORITY.blogArticle },
    };
  }

  throw new Error(`Path not found: ${pathname}`);
}
