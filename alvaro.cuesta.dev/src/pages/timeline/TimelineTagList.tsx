import { getTimelineItems } from "../../timeline/promise.ts";
import { TimelineLayout } from "./components/TimelineLayout.tsx";
import { Template } from "../../components/Template.tsx";
import { Link } from "../../components/atoms/Link.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { routeTimelineTag } from "../../routes.ts";
import { makeTitle } from "../../utils/meta.ts";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../config.ts";
import { read } from "@xenon-ssg/thunks";

type TimelineTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function TimelineTagList({
  siteRenderMeta,
}: TimelineTagListProps) {
  const timelineItems = await read(getTimelineItems);

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", "All tags"]),
        description: TIMELINE_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeTimelineBlurbSocialDescription("tags"),
        openGraph: { type: "website" },
      }}
    >
      <TimelineLayout timelineItems={timelineItems} isTagListCurrent>
        <h2>Timeline tags</h2>

        <ul>
          {timelineItems.tagsAscendingAlphabetically.map(({ tag, items }) => (
            <li key={tag}>
              <Link href={routeTimelineTag.build({ tag, page: null })}>
                {tag}
              </Link>{" "}
              ({items.length})
            </li>
          ))}
        </ul>
      </TimelineLayout>
    </Template>
  );
}
