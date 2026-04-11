import cx from "classnames";
import { Link } from "../atoms/Link";
import type { AnalyzedBlogItems } from "../../blog/analyze";
import {
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../routes";

type BlogSidebarProps = {
  blogItems: AnalyzedBlogItems;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
};

const MAX_TAGS = 10;

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  blogItems,
  currentTags = [],
  currentYear = null,
  isTagListCurrent = false,
  isYearListCurrent = false,
}) => {
  const { tagsDescendingByArticleCount, yearsSortedDescending } = blogItems;
  const currentTagsSet = new Set(currentTags);

  const hasTags = tagsDescendingByArticleCount.length > 0;
  const hasYears = yearsSortedDescending.length > 0;

  if (!hasTags && !hasYears) {
    return null;
  }

  // TODO: would like this to be wrapped in <aside> but it's ugly in Pico
  return (
    <ul className="blog-sidebar">
      {hasTags ? (
        <li>
          <Link
            className={cx(isTagListCurrent && "is-active")}
            href={routeBlogTagList.build({})}
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
                    href={routeBlogTag.build({ tag })}
                  >
                    {tag}
                  </Link>
                  &nbsp;<span className="no-wrap">({items.length})</span>
                </li>
              ))}
            {tagsDescendingByArticleCount.length > MAX_TAGS ? (
              <li>
                <Link href={routeBlogTagList.build({})}>
                  <i>(More...)</i>
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
            href={routeBlogYearList.build({})}
          >
            Years
          </Link>

          <ul>
            {yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Link
                  className={cx(currentYear === year && "is-active")}
                  href={routeBlogYear.build({ year })}
                >
                  {year}
                </Link>
                &nbsp;<span className="no-wrap">({data.totalCount})</span>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
};
