import type { ReactNode } from "react";
import { ContentSidebar } from "../../../components/molecules/ContentSidebar";
import type { AnalyzedItems } from "../../../utils/analyze";
import type { BlogItemModuleParsed } from "../../../blog/item-module";
import {
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../../routes";
import { ContentLayout } from "../../../components/molecules/ContentLayout";

type BlogLayoutProps = {
  blogItems: AnalyzedItems<BlogItemModuleParsed>;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export function BlogLayout({
  blogItems,
  currentTags,
  currentYear,
  isTagListCurrent,
  isYearListCurrent,
  children,
}: BlogLayoutProps) {
  return (
    <ContentLayout
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
    </ContentLayout>
  );
}
