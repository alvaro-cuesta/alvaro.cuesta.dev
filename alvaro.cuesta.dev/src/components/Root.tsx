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
  routeMicroblogPost,
  routeMicroblogList,
  routeMicroblogTag,
  routeMicroblogTagList,
  routeMicroblogYear,
  routeMicroblogYearList,
  routeNow,
} from "../routes";
import { BlogArticle } from "./pages/BlogArticle";
import { BlogArticleList } from "./pages/BlogArticleList";
import { BlogTag } from "./pages/BlogTag";
import { BlogTagList } from "./pages/BlogTagsList";
import { BlogYear } from "./pages/BlogYear";
import { BlogYearList } from "./pages/BlogYearList";
import { Homepage } from "./pages/Homepage";
import { MicroblogPostPage } from "./pages/MicroblogPost";
import { MicroblogList } from "./pages/MicroblogList";
import { MicroblogTag } from "./pages/MicroblogTag";
import { MicroblogTagList } from "./pages/MicroblogTagList";
import { MicroblogYear } from "./pages/MicroblogYear";
import { MicroblogYearList } from "./pages/MicroblogYearList";
import { NotFound } from "./pages/NotFound";
import { Now } from "./pages/Now";

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

  const routeMicroblogListMatch = routeMicroblogList.match(pathname);
  if (routeMicroblogListMatch) {
    return (
      <MicroblogList
        siteRenderMeta={siteRenderMeta}
        page={routeMicroblogListMatch.page}
      />
    );
  }

  if (routeMicroblogTagList.match(pathname)) {
    return <MicroblogTagList siteRenderMeta={siteRenderMeta} />;
  }

  const routeMicroblogTagMatch = routeMicroblogTag.match(pathname);
  if (routeMicroblogTagMatch) {
    return (
      <MicroblogTag
        siteRenderMeta={siteRenderMeta}
        tag={routeMicroblogTagMatch.tag}
        page={routeMicroblogTagMatch.page}
      />
    );
  }

  if (routeMicroblogYearList.match(pathname)) {
    return <MicroblogYearList siteRenderMeta={siteRenderMeta} />;
  }

  const routeMicroblogYearMatch = routeMicroblogYear.match(pathname);
  if (routeMicroblogYearMatch) {
    return (
      <MicroblogYear
        siteRenderMeta={siteRenderMeta}
        year={routeMicroblogYearMatch.year}
        page={routeMicroblogYearMatch.page}
      />
    );
  }

  const routeMicroblogPostMatch = routeMicroblogPost.match(pathname);
  if (routeMicroblogPostMatch) {
    return (
      <MicroblogPostPage
        siteRenderMeta={siteRenderMeta}
        slug={routeMicroblogPostMatch.slug}
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
