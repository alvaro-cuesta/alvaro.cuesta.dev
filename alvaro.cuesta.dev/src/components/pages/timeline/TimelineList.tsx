import { Template } from "../../Template";
import { Pagination } from "../../atoms/Pagination";
import { getTimelineItems } from "../../../timeline/promise";
import type { SiteRenderMeta } from "../../../site";
import {
  routeBlogArticleList,
  routeTimelineList,
  routeNow,
} from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";
import { TimelineLayout } from "./components/TimelineLayout";
import { TimelinePostItem } from "./components/TimelinePostItem";
import { Link } from "../../atoms/Link";

type TimelineListProps = {
  siteRenderMeta: SiteRenderMeta;
  /** Pass `null` to render as timeline home -- i.e. page 1 but with a few tweaks */
  page: number | null;
};

export async function TimelineList({
  siteRenderMeta,
  page: rawPage,
}: TimelineListProps) {
  const timelineItems = await getTimelineItems();

  const page = rawPage ?? 1;

  const itemsInPage = timelineItems.allSortedByDescendingDateByPage.get(page);

  if (itemsInPage === undefined || itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found`);
  }

  const totalPages = timelineItems.allSortedByDescendingDateByPage.size;

  const prevPageLink = timelineItems.allSortedByDescendingDateByPage.has(
    page - 1,
  )
    ? routeTimelineList.build({ page: page - 1 === 1 ? null : page - 1 })
    : null;
  const nextPageLink = timelineItems.allSortedByDescendingDateByPage.has(
    page + 1,
  )
    ? routeTimelineList.build({ page: page + 1 })
    : null;

  const canonicalPathname = routeTimelineList.build({
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle(["Timeline", page > 1 && `Page ${page}`]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription(
          page > 1 ? `page ${page}` : undefined,
        ),
        openGraph: { type: "website" },
      }}
    >
      <TimelineLayout timelineItems={timelineItems}>
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

        <div className="timeline-list">
          {itemsInPage.map((item) => (
            <TimelinePostItem key={item.filename} item={item} />
          ))}

          <section className="timeline-pagination">
            <Pagination
              prevPageLink={prevPageLink}
              nextPageLink={nextPageLink}
            />
          </section>
        </div>
      </TimelineLayout>
    </Template>
  );
}
