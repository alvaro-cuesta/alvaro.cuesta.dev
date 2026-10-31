import { Template } from "../../components/Template.tsx";
import { Pagination } from "../../components/atoms/Pagination.tsx";
import { getTimelineItems } from "../../timeline/promise.ts";
import type { TimelineItemModuleParsed } from "../../timeline/item-module.ts";
import type { Item } from "../../utils/analyze.ts";
import type { SiteRenderMeta } from "../../site.tsx";
import { routeTimelinePost } from "../../routes.ts";
import { makeTitle } from "../../utils/meta.ts";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../config.ts";
import {
  blogItemDateToShortString,
  getBlogItemDateYear,
} from "../../utils/item-dates.ts";
import { TimelineLayout } from "./components/TimelineLayout.tsx";
import { TimelinePostItem } from "./components/TimelinePostItem.tsx";
import { Link } from "../../components/atoms/Link.tsx";
import { read } from "@xenon-ssg/thunks";

type TimelinePostPageProps = {
  siteRenderMeta: SiteRenderMeta;
  post: Promise<Item<TimelineItemModuleParsed>>;
};

export async function TimelinePostPage({
  siteRenderMeta,
  post,
}: TimelinePostPageProps) {
  const [timelineItems, item] = await Promise.all([
    read(getTimelineItems),
    post,
  ]);

  const { slug, publicationDate, tags } = item.module;
  const dateStr = blogItemDateToShortString(publicationDate);

  const postPath = routeTimelinePost.build({ slug });

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
        openGraph: { type: "article" },
      }}
    >
      <TimelineLayout
        timelineItems={timelineItems}
        currentTags={tags}
        currentYear={getBlogItemDateYear(publicationDate)}
        isTagListCurrent={tags.length > 0}
        isYearListCurrent
      >
        <h2>
          Timeline post{" "}
          <small>
            <Link href={postPath}>{dateStr}</Link>
          </small>
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
