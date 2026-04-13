import { getTimelineItems } from "../../../timeline/promise";
import { Template } from "../../Template";
import { TimelineLayout } from "./components/TimelineLayout";
import { TimelinePostItem } from "./components/TimelinePostItem";
import type { SiteRenderMeta } from "../../../site";
import { routeTimelineYear } from "../../../routes";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";
import { makeTitle } from "../../../utils/meta";
import { Pagination } from "../../atoms/Pagination";
import { paginateItems } from "../../../utils/pagination";

type TimelineYearProps = {
  siteRenderMeta: SiteRenderMeta;
  year: number;
  page: number | null;
};

export async function TimelineYear({
  siteRenderMeta,
  year,
  page: rawPage,
}: TimelineYearProps) {
  const timelineItems = await getTimelineItems();

  const yearInfo = timelineItems.byYear.get(year);
  if (yearInfo === undefined) {
    throw new Error(`Year ${year} not found`);
  }

  // Flatten all items in this year sorted by descending date
  const allItemsInYear = [...yearInfo.byMonth.entries()]
    .sort(([a], [b]) =>
      a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : b - a,
    )
    .flatMap(([, items]) => items);

  const page = rawPage ?? 1;
  const { itemsInPage, totalPages } = paginateItems(allItemsInYear, page);

  if (itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found for year ${year}`);
  }

  const prevPageLink =
    page > 1
      ? routeTimelineYear.build({
          year,
          page: page - 1 === 1 ? null : page - 1,
        })
      : null;
  const nextPageLink =
    page < totalPages
      ? routeTimelineYear.build({ year, page: page + 1 })
      : null;

  const canonicalPathname = routeTimelineYear.build({
    year,
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle([
          "Timeline",
          `Year ${year}`,
          page > 1 && `Page ${page}`,
        ]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription(`year ${year}`),
        openGraph: { type: "website" },
      }}
    >
      <TimelineLayout
        timelineItems={timelineItems}
        currentYear={year}
        isYearListCurrent
      >
        <h2>
          Timeline year {year}
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
}
