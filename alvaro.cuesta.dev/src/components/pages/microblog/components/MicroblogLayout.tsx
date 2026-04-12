import type { ReactNode } from "react";
import { ContentSidebar } from "../../../molecules/ContentSidebar";
import type { AnalyzedItems } from "../../../../utils/analyze";
import type { MicroblogItemModuleParsed } from "../../../../microblog/item-module";
import type { BreadcrumbItem } from "../../../atoms/Breadcrumb";
import {
  routeMicroblogList,
  routeMicroblogTag,
  routeMicroblogTagList,
  routeMicroblogYear,
  routeMicroblogYearList,
} from "../../../../routes";
import { ContentListsLayout } from "../../../molecules/ContentListsLayout";

type MicroblogLayoutProps = {
  breadcrumbs?: BreadcrumbItem[];
  microblogItems: AnalyzedItems<MicroblogItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export const MicroblogLayout: React.FC<MicroblogLayoutProps> = ({
  breadcrumbs,
  microblogItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  children,
}) => (
  <ContentListsLayout
    rootName="Timeline"
    rootHref={routeMicroblogList.build({ page: null })}
    breadcrumbs={breadcrumbs}
    sidebar={
      <ContentSidebar
        className="microblog-sidebar"
        tagsDescendingByArticleCount={
          microblogItems.tagsDescendingByArticleCount
        }
        yearsSortedDescending={microblogItems.yearsSortedDescending}
        currentTags={currentTags}
        currentYear={currentYear}
        isTagListCurrent={isTagListCurrent}
        isYearListCurrent={isYearListCurrent}
        buildTagListHref={() => routeMicroblogTagList.build({})}
        buildTagHref={(tag) => routeMicroblogTag.build({ tag, page: null })}
        buildYearListHref={() => routeMicroblogYearList.build({})}
        buildYearHref={(year) => routeMicroblogYear.build({ year, page: null })}
      />
    }
  >
    {children}
  </ContentListsLayout>
);
