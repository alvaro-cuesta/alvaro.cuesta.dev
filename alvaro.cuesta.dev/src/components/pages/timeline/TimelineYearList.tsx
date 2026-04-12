import { getTimelineItems } from "../../../timeline/promise";
import { Template } from "../../Template";
import { TimelineLayout } from "./components/TimelineLayout";
import { Link } from "../../atoms/Link";
import type { SiteRenderMeta } from "../../../site";
import { routeTimelineYear, routeTimelineYearList } from "../../../routes";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";
import { makeTitle } from "../../../utils/meta";

type TimelineYearListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function TimelineYearList({
  siteRenderMeta,
}: TimelineYearListProps) {
  const timelineItems = await getTimelineItems();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", "All years"]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription("posts by year"),
        openGraph: { type: "website" },
      }}
    >
      <TimelineLayout
        breadcrumbs={[{ name: "Years", href: routeTimelineYearList.build({}) }]}
        timelineItems={timelineItems}
        isYearListCurrent
      >
        <h2>Timeline years</h2>

        <ul>
          {timelineItems.yearsSortedDescending.map(({ year, data }) => (
            <li key={year}>
              <Link href={routeTimelineYear.build({ year, page: null })}>
                {year}
              </Link>{" "}
              ({data.totalCount})
            </li>
          ))}
        </ul>
      </TimelineLayout>
    </Template>
  );
}
