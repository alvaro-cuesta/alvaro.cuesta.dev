import type { ReactNode } from "react";
import { ContentSidebar } from "../../../molecules/ContentSidebar";
import type { AnalyzedItems } from "../../../../utils/analyze";
import type { TimelineItemModuleParsed } from "../../../../timeline/item-module";
import type { BreadcrumbItem } from "../../../atoms/Breadcrumb";
import {
  routeTimelineList,
  routeTimelineTag,
  routeTimelineTagList,
  routeTimelineYear,
  routeTimelineYearList,
} from "../../../../routes";
import { ContentLayout } from "../../../molecules/ContentLayout";

type TimelineLayoutProps = {
  breadcrumbs?: BreadcrumbItem[];
  timelineItems: AnalyzedItems<TimelineItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export function TimelineLayout({
  breadcrumbs,
  timelineItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  children,
}: TimelineLayoutProps) {
  return (
    <ContentLayout
      rootName="Timeline"
      rootHref={routeTimelineList.build({ page: null })}
      breadcrumbs={breadcrumbs}
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
