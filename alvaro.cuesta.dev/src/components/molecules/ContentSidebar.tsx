import cx from "classnames";
import { Link } from "../atoms/Link";
import { CANONICAL_TAGS } from "../../../config";

type ContentSidebarProps = {
  className: string;
  tagsDescendingByArticleCount: { tag: string; items: unknown[] }[];
  yearsSortedDescending: { year: number; data: { totalCount: number } }[];
  currentTags?: readonly string[] | undefined;
  currentYear?: number | null | undefined;
  isTagListCurrent?: boolean | undefined;
  isYearListCurrent?: boolean | undefined;
  buildTagListHref: () => string;
  buildTagHref: (tag: string) => string;
  buildYearListHref: () => string;
  buildYearHref: (year: number) => string;
};

const MAX_TAGS = 10;

export const ContentSidebar: React.FC<ContentSidebarProps> = ({
  className,
  tagsDescendingByArticleCount,
  yearsSortedDescending,
  currentTags = [],
  currentYear = null,
  isTagListCurrent = false,
  isYearListCurrent = false,
  buildTagListHref,
  buildTagHref,
  buildYearListHref,
  buildYearHref,
}) => {
  const currentTagsSet = new Set(
    currentTags.map((tag) => CANONICAL_TAGS[tag] ?? tag),
  );

  const hasTags = tagsDescendingByArticleCount.length > 0;
  const hasYears = yearsSortedDescending.length > 0;

  if (!hasTags && !hasYears) {
    return null;
  }

  const omittedTags = tagsDescendingByArticleCount.length - MAX_TAGS;

  // TODO: would like this to be wrapped in <aside> but it's ugly in Pico
  return (
    <ul className={className}>
      {hasTags ? (
        <li>
          <Link
            className={cx(isTagListCurrent && "is-active")}
            href={buildTagListHref()}
          >
            Tags
          </Link>

          <ul>
            {tagsDescendingByArticleCount
              .slice(0, MAX_TAGS)
              .map(({ tag, items }) => (
                <li key={tag}>
                  <Link
                    className={cx(currentTagsSet.has(tag) && "is-active")}
                    href={buildTagHref(tag)}
                  >
                    {tag}
                  </Link>
                  <span className="no-wrap">&nbsp;({items.length})</span>
                </li>
              ))}
            {omittedTags > 0 ? (
              <li>
                <Link href={buildTagListHref()}>
                  <i>
                    ({omittedTags} more tag{omittedTags > 1 ? "s" : ""}...)
                  </i>
                </Link>
              </li>
            ) : null}
          </ul>
        </li>
      ) : null}
      {hasYears ? (
        <li>
          <Link
            className={cx(isYearListCurrent && "is-active")}
            href={buildYearListHref()}
          >
            Years
          </Link>

          <ul>
            {yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Link
                  className={cx(currentYear === year && "is-active")}
                  href={buildYearHref(year)}
                >
                  {year}
                </Link>
                <span className="no-wrap">&nbsp;({data.totalCount})</span>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
};
