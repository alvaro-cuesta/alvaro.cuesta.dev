import type { ReactNode } from "react";
import { ContentSidebar } from "../../../components/molecules/ContentSidebar";
import type { AnalyzedItems } from "../../../utils/analyze";
import type { TimelineItemModuleParsed } from "../../../timeline/item-module";
import {
  routeTimelineTag,
  routeTimelineTagList,
  routeTimelineYear,
  routeTimelineYearList,
} from "../../../routes";
import { ContentLayout } from "../../../components/molecules/ContentLayout";

type TimelineLayoutProps = {
  timelineItems: AnalyzedItems<TimelineItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export function TimelineLayout({
  timelineItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  children,
}: TimelineLayoutProps) {
  return (
    <ContentLayout
      sidebar={
        <ContentSidebar
          className="timeline-sidebar"
          tagsDescendingByArticleCount={
            timelineItems.tagsDescendingByArticleCount
          }
          yearsSortedDescending={timelineItems.yearsSortedDescending}
          currentTags={currentTags}
          currentYear={currentYear}
          isTagListCurrent={isTagListCurrent}
          isYearListCurrent={isYearListCurrent}
          buildTagListHref={() => routeTimelineTagList.build({})}
          buildTagHref={(tag) => routeTimelineTag.build({ tag, page: null })}
          buildYearListHref={() => routeTimelineYearList.build({})}
          buildYearHref={(year) =>
            routeTimelineYear.build({ year, page: null })
          }
        />
      }
    >
      {children}
    </ContentLayout>
  );
}
