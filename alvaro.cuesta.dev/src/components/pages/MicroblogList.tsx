import { Template } from "../Template";
import { Pagination } from "../atoms/Pagination";
import { useMicroblogItems } from "../../microblog/promise";
import type { SiteRenderMeta } from "../../site";
import {
  routeBlogArticleList,
  routeMicroblogList,
  routeNow,
} from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { MicroblogPostItem } from "../molecules/MicroblogPostItem";
import { Link } from "../atoms/Link";

type MicroblogListProps = {
  siteRenderMeta: SiteRenderMeta;
  /** Pass `null` to render as microblog home -- i.e. page 1 but with a few tweaks */
  page: number | null;
};

export const MicroblogList: React.FC<MicroblogListProps> = ({
  siteRenderMeta,
  page: rawPage,
}) => {
  const microblogItems = useMicroblogItems();

  const page = rawPage ?? 1;

  const itemsInPage = microblogItems.allSortedByDescendingDateByPage.get(page);

  if (itemsInPage === undefined || itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found`);
  }

  const totalPages = microblogItems.allSortedByDescendingDateByPage.size;

  const prevPageLink = microblogItems.allSortedByDescendingDateByPage.has(
    page - 1,
  )
    ? routeMicroblogList.build({ page: page - 1 === 1 ? null : page - 1 })
    : null;
  const nextPageLink = microblogItems.allSortedByDescendingDateByPage.has(
    page + 1,
  )
    ? routeMicroblogList.build({ page: page + 1 })
    : null;

  const canonicalPathname = routeMicroblogList.build({
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle(["Timeline", page > 1 && `Page ${page}`]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(
          page > 1 ? `page ${page}` : undefined,
        ),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
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
        microblogItems={microblogItems}
      >
        <h2>Timeline{page > 1 ? ` (page ${page} of ${totalPages})` : ""}</h2>

        {page === 1 && (
          <>
            <p>
              I post about a variety of topics, including software development,
              technology, art, and more. Short-form thoughts, quick updates, and
              random musings live here.
            </p>
            <p>
              Check out my{" "}
              <Link href={routeBlogArticleList.build({ page: null })}>
                blog
              </Link>{" "}
              for more in-depth articles, essays and research notes. You can
              also read my <Link href={routeNow.build({})}>Now page</Link> to
              see what I'm up to!
            </p>
          </>
        )}

        <div className="microblog-list">
          {itemsInPage.map((item) => (
            <MicroblogPostItem key={item.filename} item={item} />
          ))}

          <section className="microblog-pagination">
            <Pagination
              prevPageLink={prevPageLink}
              nextPageLink={nextPageLink}
            />
          </section>
        </div>
      </MicroblogListsLayout>
    </Template>
  );
};
