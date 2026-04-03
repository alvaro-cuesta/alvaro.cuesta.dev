import type { ReactNode } from "react";
import { BlogSidebar } from "./BlogSidebar";
import type { AnalyzedBlogItems } from "../../blog/analyze";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";
import { routeBlogArticleList } from "../../routes";

type BlogListsLayoutProps = {
  breadcrumbs: BreadcrumbItem[];
  blogItems: AnalyzedBlogItems;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export const BlogListsLayout: React.FC<BlogListsLayoutProps> = ({
  breadcrumbs,
  blogItems,
  currentTags = [],
  currentYear = null,
  isTagListCurrent = false,
  isYearListCurrent = false,
  children,
}) => (
  <>
    <div className="flex-responsive">
      <div className="bloglist-main">
        <Breadcrumb
          breadcrumbs={[
            {
              name: "Blog",
              href: routeBlogArticleList.build({ page: null }),
            },
            ...breadcrumbs,
          ]}
        />
        <article>{children}</article>
      </div>
      <BlogSidebar
        blogItems={blogItems}
        currentTags={currentTags}
        currentYear={currentYear}
        isTagListCurrent={isTagListCurrent}
        isYearListCurrent={isYearListCurrent}
      />
    </div>
  </>
);
