import type { SiteRenderMeta } from "../site";
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
} from "../routes";
import { BlogArticle } from "./pages/blog/BlogArticle";
import { BlogArticleList } from "./pages/blog/BlogArticleList";
import { BlogTag } from "./pages/blog/BlogTag";
import { BlogTagList } from "./pages/blog/BlogTagsList";
import { BlogYear } from "./pages/blog/BlogYear";
import { BlogYearList } from "./pages/blog/BlogYearList";
import { Homepage } from "./pages/Homepage";
import { TimelinePostPage } from "./pages/timeline/TimelinePost";
import { TimelineList } from "./pages/timeline/TimelineList";
import { TimelineTag } from "./pages/timeline/TimelineTag";
import { TimelineTagList } from "./pages/timeline/TimelineTagList";
import { TimelineYear } from "./pages/timeline/TimelineYear";
import { TimelineYearList } from "./pages/timeline/TimelineYearList";
import { NotFound } from "./pages/NotFound";
import { makeMdxPage } from "./molecules/MdxPage";

const Now = makeMdxPage(import.meta.resolve("./pages/Now.mdx"));
const Bookmarks = makeMdxPage(import.meta.resolve("./pages/Bookmarks.mdx"));

type RootProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const Root: React.FC<RootProps> = ({ siteRenderMeta }) => {
  const pathname = siteRenderMeta.pathname;

  if (routeHome.match(pathname)) {
    return <Homepage siteRenderMeta={siteRenderMeta} />;
  }

  if (route404.match(pathname)) {
    return <NotFound siteRenderMeta={siteRenderMeta} />;
  }

  if (routeNow.match(pathname)) {
    return <Now siteRenderMeta={siteRenderMeta} />;
  }

  if (routeBookmarks.match(pathname)) {
    return <Bookmarks siteRenderMeta={siteRenderMeta} />;
  }

  const routeTimelineListMatch = routeTimelineList.match(pathname);
  if (routeTimelineListMatch) {
    return (
      <TimelineList
        siteRenderMeta={siteRenderMeta}
        page={routeTimelineListMatch.page}
      />
    );
  }

  if (routeTimelineTagList.match(pathname)) {
    return <TimelineTagList siteRenderMeta={siteRenderMeta} />;
  }

  const routeTimelineTagMatch = routeTimelineTag.match(pathname);
  if (routeTimelineTagMatch) {
    return (
      <TimelineTag
        siteRenderMeta={siteRenderMeta}
        tag={routeTimelineTagMatch.tag}
        page={routeTimelineTagMatch.page}
      />
    );
  }

  if (routeTimelineYearList.match(pathname)) {
    return <TimelineYearList siteRenderMeta={siteRenderMeta} />;
  }

  const routeTimelineYearMatch = routeTimelineYear.match(pathname);
  if (routeTimelineYearMatch) {
    return (
      <TimelineYear
        siteRenderMeta={siteRenderMeta}
        year={routeTimelineYearMatch.year}
        page={routeTimelineYearMatch.page}
      />
    );
  }

  const routeTimelinePostMatch = routeTimelinePost.match(pathname);
  if (routeTimelinePostMatch) {
    return (
      <TimelinePostPage
        siteRenderMeta={siteRenderMeta}
        slug={routeTimelinePostMatch.slug}
      />
    );
  }

  const routeBlogPageMatch = routeBlogArticleList.match(pathname);
  if (routeBlogPageMatch) {
    return (
      <BlogArticleList
        siteRenderMeta={siteRenderMeta}
        page={routeBlogPageMatch.page}
      />
    );
  }

  if (routeBlogTagList.match(pathname)) {
    return <BlogTagList siteRenderMeta={siteRenderMeta} />;
  }

  const routeBlogTagMatch = routeBlogTag.match(pathname);
  if (routeBlogTagMatch) {
    return (
      <BlogTag siteRenderMeta={siteRenderMeta} tag={routeBlogTagMatch.tag} />
    );
  }

  if (routeBlogYearList.match(pathname)) {
    return <BlogYearList siteRenderMeta={siteRenderMeta} />;
  }

  const routeBlogYearMatch = routeBlogYear.match(pathname);
  if (routeBlogYearMatch) {
    return (
      <BlogYear
        siteRenderMeta={siteRenderMeta}
        year={routeBlogYearMatch.year}
      />
    );
  }

  const routeBlogArticleMatch = routeBlogArticle.match(pathname);
  if (routeBlogArticleMatch) {
    return (
      <BlogArticle
        siteRenderMeta={siteRenderMeta}
        slug={routeBlogArticleMatch.slug}
      />
    );
  }

  throw new Error(`Path not found: ${pathname}`);
};
