import { Link } from "./Link";

type PaginationProps = {
  prevPageLink: string | null;
  nextPageLink: string | null;
};

export const Pagination: React.FC<PaginationProps> = ({
  prevPageLink,
  nextPageLink,
}) => (
  <div className="flex-space-between">
    {prevPageLink ? (
      <Link href={prevPageLink} className="pagination-link">
        <span className="no-underline">🡄&nbsp;</span>Previous page
      </Link>
    ) : (
      // We need a placeholder to keep the layout
      <div />
    )}
    {nextPageLink ? (
      <Link href={nextPageLink} className="pagination-link">
        Next page<span className="no-underline">&nbsp;🡆</span>
      </Link>
    ) : null}
  </div>
);
