import { Template } from "../../Template";
import { Pagination } from "../../atoms/Pagination";
import { useTimelineItems } from "../../../timeline/promise";
import type { SiteRenderMeta } from "../../../site";
import { routeTimelinePost, routeTimelineList } from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";
import {
  blogItemDateToShortString,
  getBlogItemDateYear,
} from "../../../utils/item-dates";
import { TimelineLayout } from "./components/TimelineLayout";
import { TimelinePostItem } from "./components/TimelinePostItem";

type TimelinePostPageProps = {
  siteRenderMeta: SiteRenderMeta;
  slug: string;
};

export function TimelinePostPage({
  siteRenderMeta,
  slug,
}: TimelinePostPageProps) {
  const timelineItems = useTimelineItems();

  const item = timelineItems.bySlug.get(slug);

  if (item === undefined) {
    throw new Error(`Timeline post "${slug}" not found`);
  }

  const { publicationDate, lastModificationDate, tags } = item.module;
  const dateStr = blogItemDateToShortString(publicationDate);

  const page = timelineItems.pageBySlug.get(slug) ?? 1;

  const sortedIndex = timelineItems.allSortedByDescendingDate.indexOf(item);
  const newerPost = timelineItems.allSortedByDescendingDate[sortedIndex - 1];
  const olderPost = timelineItems.allSortedByDescendingDate[sortedIndex + 1];

  const newerPostHref = newerPost
    ? routeTimelinePost.build({ slug: newerPost.module.slug })
    : null;
  const olderPostHref = olderPost
    ? routeTimelinePost.build({ slug: olderPost.module.slug })
    : null;

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", dateStr]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription(dateStr),
        publishedTime: publicationDate,
        modifiedTime: lastModificationDate ?? undefined,
        openGraph: { type: "article" },
      }}
    >
      <TimelineLayout
        breadcrumbs={[
          ...(page > 1
            ? [
                {
                  name: `Page ${page}`,
                  href: routeTimelineList.build({ page }),
                },
              ]
            : []),
          { name: dateStr, href: siteRenderMeta.pathname },
        ]}
        timelineItems={timelineItems}
        currentTags={tags}
        currentYear={getBlogItemDateYear(publicationDate)}
        isTagListCurrent={tags.length > 0}
        isYearListCurrent
      >
        <h2>
          Timeline post{" "}
          <small>{blogItemDateToShortString(publicationDate)}</small>
        </h2>

        <TimelinePostItem item={item} />

        <section className="timeline-pagination">
          <Pagination
            prevPageLink={newerPostHref}
            nextPageLink={olderPostHref}
            prevLabel="Newer post"
            nextLabel="Older post"
          />
        </section>
      </TimelineLayout>
    </Template>
  );
}
