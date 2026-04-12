import { useTimelineItems } from "../../../timeline/promise";
import { TimelineLayout } from "./components/TimelineLayout";
import { Template } from "../../Template";
import { Link } from "../../atoms/Link";
import type { SiteRenderMeta } from "../../../site";
import { routeTimelineTag, routeTimelineTagList } from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  TIMELINE_BLURB_DESCRIPTION,
  makeTimelineBlurbSocialDescription,
} from "../../../../config";

type TimelineTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export function TimelineTagList({ siteRenderMeta }: TimelineTagListProps) {
  const timelineItems = useTimelineItems();

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
      <TimelineLayout
        breadcrumbs={[{ name: "Tags", href: routeTimelineTagList.build({}) }]}
        timelineItems={timelineItems}
        isTagListCurrent
      >
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
