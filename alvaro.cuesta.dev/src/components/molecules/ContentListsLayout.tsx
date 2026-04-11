import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";
import { Link } from "../atoms/Link";
import { Icon } from "../atoms/Icon";

type ContentListsLayoutProps = {
  rootName: string;
  rootHref: string;
  feedBasePath: string;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  sidebar: ReactNode;
  children?: ReactNode;
};

export const ContentListsLayout: React.FC<ContentListsLayoutProps> = ({
  rootName,
  rootHref,
  feedBasePath,
  breadcrumbs = [],
  sidebar,
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
                name: rootName,
                href: rootHref,
              },
              ...breadcrumbs,
            ]}
          />
        </span>
        <span className="feeds">
          <Icon collection="fas" name="rss" aria-hidden /> Feed{" "}
          <Link href={`${feedBasePath}feed.rss`} Component={"a"}>
            RSS
          </Link>{" "}
          /{" "}
          <Link href={`${feedBasePath}atom.xml`} Component={"a"}>
            Atom
          </Link>{" "}
          /{" "}
          <Link href={`${feedBasePath}feed.json`} Component={"a"}>
            JSON
          </Link>
        </span>
      </footer>
    </section>
    {sidebar}
  </div>
);
