import { type ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";

export type ContentListsLayoutSection = "blog" | "timeline";

export type ContentListsLayoutProps = {
  rootName: string;
  rootHref: string;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  sidebar: ReactNode;
  children?: ReactNode;
};

export const ContentListsLayout: React.FC<ContentListsLayoutProps> = ({
  rootName,
  rootHref,
  breadcrumbs = [],
  sidebar,
  children,
}) => {
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
        </footer>
      </section>
      {sidebar}
    </div>
  );
};
