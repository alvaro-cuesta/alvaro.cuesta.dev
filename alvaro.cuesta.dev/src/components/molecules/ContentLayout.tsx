import { type ReactNode } from "react";

export type ContentLayoutProps = {
  sidebar: ReactNode;
  children?: ReactNode;
};

export function ContentLayout({ sidebar, children }: ContentLayoutProps) {
  return (
    <div className="flex-responsive">
      <section className="bloglist-main">{children}</section>
      {sidebar}
    </div>
  );
}
