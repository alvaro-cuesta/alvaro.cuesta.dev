import type { ReactNode } from "react";
import { ContentSidebar } from "../../../components/molecules/ContentSidebar.tsx";
import type { AnalyzedItems } from "../../../utils/analyze.ts";
import type { BlogItemModuleParsed } from "../../../blog/item-module.ts";
import {
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../../routes.ts";
import { ContentLayout } from "../../../components/molecules/ContentLayout.tsx";

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
