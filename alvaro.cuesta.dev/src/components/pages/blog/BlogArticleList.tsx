import { Template } from "../../Template";
import { Pagination } from "../../atoms/Pagination";
import { BlogLayout } from "./components/BlogLayout";
import { useBlogItems } from "../../../blog/promise";
import { BlogArticleListItem } from "./components/BlogArticleListItem";
import type { SiteRenderMeta } from "../../../site";
import {
  routeBlogArticleList,
  routeTimelineList,
  routeNow,
} from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../../config";
import { Link } from "../../atoms/Link";

type BlogArticleListProps = {
  siteRenderMeta: SiteRenderMeta;
  /** Pass `null` to render as blog home -- i.e. page 1 but with a few tweaks */
  page: number | null;
};

export function BlogArticleList({
  siteRenderMeta,
  page: rawPage,
}: BlogArticleListProps) {
  const blogItems = useBlogItems();

  const page = rawPage ?? 1;

  const itemsInPage = blogItems.allSortedByDescendingDateByPage.get(page);

  if (itemsInPage === undefined || itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found`);
  }

  const totalPages = blogItems.allSortedByDescendingDateByPage.size;

  const prevPageLink = blogItems.allSortedByDescendingDateByPage.has(page - 1)
    ? routeBlogArticleList.build({ page: page - 1 === 1 ? null : page - 1 })
    : null;
  const nextPageLink = blogItems.allSortedByDescendingDateByPage.has(page + 1)
    ? routeBlogArticleList.build({ page: page + 1 })
    : null;

  // We allow linking to /blog/page/1 for consistency, but we add a canonical link to /blog
  const canonicalPathname = routeBlogArticleList.build({
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle(["Blog", page > 1 && `Page ${page}`]),
        description: BLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Blog"]),
        socialDescription: makeBlogBlurbSocialDescription(
          page > 1 ? `page ${page}` : undefined,
        ),
        openGraph: { type: "website" },
      }}
    >
      <BlogLayout
        breadcrumbs={
          page > 1 && totalPages > 1
            ? [
                {
                  name: `Page ${page} of ${totalPages}`,
                  href: canonicalPathname,
                },
              ]
            : []
        }
        blogItems={blogItems}
      >
        <h2>Blog{page > 1 ? ` (page ${page} of ${totalPages})` : ""}</h2>

        {page === 1 && (
          <>
            <p>
              I post about a variety of topics, including software development,
              technology, art, and more. Long-form articles, essays, research
              notes, and other more in-depth content will live here.
            </p>
            <p>
              Check out my{" "}
              <Link href={routeTimelineList.build({ page: null })}>
                timeline
              </Link>{" "}
              for more frequent updates, quick thoughts, and random musings. You
              can also read my <Link href={routeNow.build({})}>Now page</Link>{" "}
              to see what I'm up to!
            </p>
          </>
        )}

        <article>
          <ul>
            {itemsInPage.map((item) => (
              <BlogArticleListItem key={item.filename} item={item} />
            ))}
          </ul>
        </article>

        <section>
          <Pagination prevPageLink={prevPageLink} nextPageLink={nextPageLink} />
        </section>
      </BlogLayout>
    </Template>
  );
}
