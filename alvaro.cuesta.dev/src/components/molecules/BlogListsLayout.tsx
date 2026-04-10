import type { ReactNode } from "react";
import { BlogSidebar } from "./BlogSidebar";
import type { AnalyzedBlogItems } from "../../blog/analyze";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";
import { routeBlogArticleList } from "../../routes";
import { Link } from "../atoms/Link";
import { Icon } from "../atoms/Icon";

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
      <section className="bloglist-main">
        <article>{children}</article>
        <footer>
          <span>
            <Breadcrumb
              breadcrumbs={[
                {
                  name: "Blog",
                  href: routeBlogArticleList.build({ page: null }),
                },
                ...breadcrumbs,
              ]}
            />
          </span>
          <span className="feeds">
            <Icon collection="fas" name="rss" aria-hidden /> Feed{" "}
            <Link href="/blog/feed.rss" Component={"a"}>
              RSS
            </Link>{" "}
            /{" "}
            <Link href="/blog/atom.xml" Component={"a"}>
              Atom
            </Link>{" "}
            /{" "}
            <Link href="/blog/feed.json" Component={"a"}>
              JSON
            </Link>
          </span>
        </footer>
      </section>
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
