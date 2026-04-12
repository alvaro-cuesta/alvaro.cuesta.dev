import type { ReactNode } from "react";
import { ContentSidebar } from "./ContentSidebar";
import type { AnalyzedItems } from "../../utils/analyze";
import type { BlogItemModuleParsed } from "../../blog/item-module";
import type { BreadcrumbItem } from "../atoms/Breadcrumb";
import {
  routeBlogArticleList,
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../routes";
import { ContentListsLayout } from "./ContentListsLayout";
import type { SiteFeedUrls } from "../../site";

type BlogListsLayoutProps = {
  breadcrumbs: BreadcrumbItem[];
  blogItems: AnalyzedItems<BlogItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  feedUrls: SiteFeedUrls;
  children?: ReactNode;
};

export const BlogListsLayout: React.FC<BlogListsLayoutProps> = ({
  breadcrumbs,
  blogItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  feedUrls,
  children,
}) => (
  <ContentListsLayout
    rootName="Blog"
    rootHref={routeBlogArticleList.build({ page: null })}
    breadcrumbs={breadcrumbs}
    feedUrls={feedUrls}
    currentSection="blog"
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
