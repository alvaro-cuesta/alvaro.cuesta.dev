import { TimelineLayout } from "./components/TimelineLayout";
import { TimelinePostItem } from "./components/TimelinePostItem";
import { Template } from "../../Template";
import { useTimelineItems } from "../../../timeline/promise";
import type { SiteRenderMeta } from "../../../site";
import { routeTimelineTag, routeTimelineTagList } from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";
import { Pagination } from "../../atoms/Pagination";
import { paginateItems } from "../../../utils/pagination";

type TimelineTagProps = {
  siteRenderMeta: SiteRenderMeta;
  tag: string;
  page: number | null;
};

export const TimelineTag: React.FC<TimelineTagProps> = ({
  siteRenderMeta,
  tag,
  page: rawPage,
}) => {
  const timelineItems = useTimelineItems();

  const allItemsInTag = timelineItems.byTag.get(tag);

  if (allItemsInTag === undefined) {
    throw new Error(`Tag ${tag} not found`);
  }

  const page = rawPage ?? 1;
  const { itemsInPage, totalPages } = paginateItems(allItemsInTag, page);

  if (itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found for tag ${tag}`);
  }

  const prevPageLink =
    page > 1
      ? routeTimelineTag.build({ tag, page: page - 1 === 1 ? null : page - 1 })
      : null;
  const nextPageLink =
    page < totalPages ? routeTimelineTag.build({ tag, page: page + 1 }) : null;

  const canonicalPathname = routeTimelineTag.build({
    tag,
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle([
          "Timeline",
          `Tag "${tag}"`,
          page > 1 && `Page ${page}`,
        ]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription(`tag ${tag}`),
        openGraph: { type: "website" },
      }}
    >
      <TimelineLayout
        breadcrumbs={[
          { name: "Tags", href: routeTimelineTagList.build({}) },
          { name: tag, href: routeTimelineTag.build({ tag, page: null }) },
          ...(page > 1 && totalPages > 1
            ? [
                {
                  name: `Page ${page} of ${totalPages}`,
                  href: canonicalPathname,
                },
              ]
            : []),
        ]}
        timelineItems={timelineItems}
        currentTags={[tag]}
        isTagListCurrent
      >
        <h2>
          Timeline tag "{tag}"
          {page > 1 ? ` (page ${page} of ${totalPages})` : ""}
        </h2>

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
};
