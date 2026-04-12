import { Fragment, type ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";
import { Link } from "../atoms/Link";
import { Icon } from "../atoms/Icon";
import type { SiteFeedUrls } from "../../site";

export type ContentListsLayoutSection = "blog" | "timeline";

export type ContentListsLayoutProps = {
  rootName: string;
  rootHref: string;
  feedUrls: SiteFeedUrls;
  currentSection?: ContentListsLayoutSection;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  sidebar: ReactNode;
  children?: ReactNode;
};

type FeedLinkEntry = {
  key: ContentListsLayoutSection | "all";
  label: string;
  href: string;
};

export const ContentListsLayout: React.FC<ContentListsLayoutProps> = ({
  rootName,
  rootHref,
  feedUrls,
  currentSection,
  breadcrumbs = [],
  sidebar,
  children,
}) => {
  const feedEntries: FeedLinkEntry[] = [
    { key: "blog", label: "Blog", href: feedUrls.blog },
    { key: "timeline", label: "Timeline", href: feedUrls.timeline },
    { key: "all", label: "All", href: feedUrls.all },
  ];

  const orderedFeedEntries =
    currentSection === undefined
      ? feedEntries
      : [
          ...feedEntries.filter((entry) => entry.key === currentSection),
          ...feedEntries.filter((entry) => entry.key !== currentSection),
        ];

  return (
    <div className="flex-responsive">
      <section className="bloglist-main">
        {children}
        <footer>
          <span>
            <Breadcrumb
              breadcrumbs={[
                {
                  name: rootName,
                  href: rootHref,
                },
                ...breadcrumbs,
              ]}
            />
          </span>
          <span className="feeds">
            <Icon collection="fas" name="rss" aria-hidden /> Feed{" "}
            {orderedFeedEntries.map((entry, index) => (
              <Fragment key={entry.key}>
                {index > 0 && " / "}
                <Link href={entry.href}>{entry.label}</Link>
              </Fragment>
            ))}
          </span>
        </footer>
      </section>
      {sidebar}
    </div>
  );
};
