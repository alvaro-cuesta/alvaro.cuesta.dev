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
} from "../routes";
import { BlogArticle } from "./pages/BlogArticle";
import { BlogArticleList } from "./pages/BlogArticleList";
import { BlogTag } from "./pages/BlogTag";
import { BlogTagList } from "./pages/BlogTagsList";
import { BlogYear } from "./pages/BlogYear";
import { BlogYearList } from "./pages/BlogYearList";
import { Homepage } from "./pages/Homepage";
import { NotFound } from "./pages/NotFound";

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
