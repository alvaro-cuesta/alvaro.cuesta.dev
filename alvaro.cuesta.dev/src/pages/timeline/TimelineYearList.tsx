import { getTimelineItems } from "../../timeline/promise.ts";
import { Template } from "../../components/Template.tsx";
import { TimelineLayout } from "./components/TimelineLayout.tsx";
import { Link } from "../../components/atoms/Link.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { routeTimelineYear } from "../../routes.ts";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../config.ts";
import { makeTitle } from "../../utils/meta.ts";
import { read } from "@xenon-ssg/thunks";

type TimelineYearListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function TimelineYearList({
  siteRenderMeta,
}: TimelineYearListProps) {
  const timelineItems = await read(getTimelineItems);

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
      <TimelineLayout timelineItems={timelineItems} isYearListCurrent>
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
