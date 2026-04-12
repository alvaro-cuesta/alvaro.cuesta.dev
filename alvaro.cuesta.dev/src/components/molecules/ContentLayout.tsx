import { type ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../atoms/Breadcrumb";

export type ContentLayoutProps = {
  rootName: string;
  rootHref: string;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  sidebar: ReactNode;
  children?: ReactNode;
};

export function ContentLayout({
  rootName,
  rootHref,
  breadcrumbs = [],
  sidebar,
  children,
}: ContentLayoutProps) {
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
}
