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
  routeBookmarks,
} from "../routes";
import { BlogArticle } from "./pages/blog/BlogArticle";
import { BlogArticleList } from "./pages/blog/BlogArticleList";
import { BlogTag } from "./pages/blog/BlogTag";
import { BlogTagList } from "./pages/blog/BlogTagsList";
import { BlogYear } from "./pages/blog/BlogYear";
import { BlogYearList } from "./pages/blog/BlogYearList";
import { Homepage } from "./pages/Homepage";
import { MicroblogPostPage } from "./pages/microblog/MicroblogPost";
import { MicroblogList } from "./pages/microblog/MicroblogList";
import { MicroblogTag } from "./pages/microblog/MicroblogTag";
import { MicroblogTagList } from "./pages/microblog/MicroblogTagList";
import { MicroblogYear } from "./pages/microblog/MicroblogYear";
import { MicroblogYearList } from "./pages/microblog/MicroblogYearList";
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
