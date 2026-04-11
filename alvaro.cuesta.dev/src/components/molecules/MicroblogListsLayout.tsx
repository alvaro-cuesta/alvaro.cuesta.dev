import type { ReactNode } from "react";
import { MicroblogSidebar } from "./MicroblogSidebar";
import type { AnalyzedMicroblogItems } from "../../microblog/analyze";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";
import { routeMicroblogList } from "../../routes";
import { Link } from "../atoms/Link";
import { Icon } from "../atoms/Icon";

type MicroblogListsLayoutProps = {
  breadcrumbs?: BreadcrumbItem[];
  microblogItems: AnalyzedMicroblogItems;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
  children?: ReactNode;
};

export const MicroblogListsLayout: React.FC<MicroblogListsLayoutProps> = ({
  breadcrumbs = [],
  microblogItems,
  currentTags = [],
  currentYear = null,
  isTagListCurrent = false,
  isYearListCurrent = false,
  children,
}) => (
  <div className="flex-responsive">
    <section className="bloglist-main">
      {children}
      <footer>
        <span>
          <Breadcrumb
            breadcrumbs={[
              {
                name: "Timeline",
                href: routeMicroblogList.build({ page: null }),
              },
              ...breadcrumbs,
            ]}
          />
        </span>
        <span className="feeds">
          <Icon collection="fas" name="rss" aria-hidden /> Feed{" "}
          <Link href="/timeline/feed.rss" Component={"a"}>
            RSS
          </Link>{" "}
          /{" "}
          <Link href="/timeline/atom.xml" Component={"a"}>
            Atom
          </Link>{" "}
          /{" "}
          <Link href="/timeline/feed.json" Component={"a"}>
            JSON
          </Link>
        </span>
      </footer>
    </section>
    <MicroblogSidebar
      microblogItems={microblogItems}
      currentTags={currentTags}
      currentYear={currentYear}
      isTagListCurrent={isTagListCurrent}
      isYearListCurrent={isYearListCurrent}
    />
  </div>
);
