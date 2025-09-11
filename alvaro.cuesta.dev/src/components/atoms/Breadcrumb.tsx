import { Link } from "./Link";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

type BreadcrumbProps = {
  breadcrumbs: BreadcrumbItem[];
};

export const Breadcrumb: React.FC<BreadcrumbProps> = (props) => (
  <nav aria-label="breadcrumb">
    <ul>
      {props.breadcrumbs.map((breadcrumb, index) => {
        const isLastItem = index === props.breadcrumbs.length - 1;
        // TODO: Maybe not needed if using Wouter
        const WrapperTag = isLastItem ? "strong" : "span";

        return (
          <li key={index}>
            <WrapperTag>
              <Link href={breadcrumb.href}>{breadcrumb.name}</Link>
            </WrapperTag>
          </li>
        );
      })}
    </ul>
  </nav>
);
