import type { ReactNode } from "react";
import { ContentSidebar } from "../../../molecules/ContentSidebar";
import type { AnalyzedItems } from "../../../../utils/analyze";
import type { BlogItemModuleParsed } from "../../../../blog/item-module";
import type { BreadcrumbItem } from "../../../atoms/Breadcrumb";
import {
  routeBlogArticleList,
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../../../routes";
import { ContentListsLayout } from "../../../molecules/ContentListsLayout";

type BlogLayoutProps = {
  breadcrumbs: BreadcrumbItem[];
  blogItems: AnalyzedItems<BlogItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export const BlogLayout: React.FC<BlogLayoutProps> = ({
  breadcrumbs,
  blogItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  children,
}) => (
  <ContentListsLayout
    rootName="Blog"
    rootHref={routeBlogArticleList.build({ page: null })}
    breadcrumbs={breadcrumbs}
    sidebar={
      <ContentSidebar
        className="blog-sidebar"
        tagsDescendingByArticleCount={blogItems.tagsDescendingByArticleCount}
        yearsSortedDescending={blogItems.yearsSortedDescending}
        currentTags={currentTags}
        currentYear={currentYear}
        isTagListCurrent={isTagListCurrent}
        isYearListCurrent={isYearListCurrent}
        buildTagListHref={() => routeBlogTagList.build({})}
        buildTagHref={(tag) => routeBlogTag.build({ tag })}
        buildYearListHref={() => routeBlogYearList.build({})}
        buildYearHref={(year) => routeBlogYear.build({ year })}
      />
    }
  >
    {children}
  </ContentListsLayout>
);
