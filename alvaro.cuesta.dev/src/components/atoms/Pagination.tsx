import { Icon } from "./Icon";
import { Link } from "./Link";

type PaginationProps = {
  prevPageLink: string | null;
  nextPageLink: string | null;
  prevLabel?: string;
  nextLabel?: string;
};

export function Pagination({
  prevPageLink,
  nextPageLink,
  prevLabel = "Previous page",
  nextLabel = "Next page",
}: PaginationProps) {
  return (
    <div className="flex-space-between">
      {prevPageLink ? (
        <Link href={prevPageLink} className="pagination-link">
          <span className="no-underline">
            <Icon name="arrow-left" aria-hidden="true" />
            &nbsp;
          </span>
          {prevLabel}
        </Link>
      ) : (
        // We need a placeholder to keep the layout
        <div />
      )}
      {nextPageLink ? (
        <Link href={nextPageLink} className="pagination-link">
          {nextLabel}
          <span className="no-underline">
            &nbsp;
            <Icon name="arrow-right" aria-hidden="true" />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
