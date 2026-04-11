import cx from "classnames";
import { Link } from "../atoms/Link";
import type { AnalyzedMicroblogItems } from "../../microblog/analyze";
import {
  routeMicroblogTag,
  routeMicroblogTagList,
  routeMicroblogYear,
  routeMicroblogYearList,
} from "../../routes";

type MicroblogSidebarProps = {
  microblogItems: AnalyzedMicroblogItems;
  currentTags?: readonly string[];
  currentYear?: number | null;
  isTagListCurrent?: boolean;
  isYearListCurrent?: boolean;
};

const MAX_TAGS = 10;

export const MicroblogSidebar: React.FC<MicroblogSidebarProps> = ({
  microblogItems,
  currentTags = [],
  currentYear = null,
  isTagListCurrent = false,
  isYearListCurrent = false,
}) => {
  const { tagsDescendingByArticleCount, yearsSortedDescending } =
    microblogItems;
  const currentTagsSet = new Set(currentTags);

  const hasTags = tagsDescendingByArticleCount.length > 0;
  const hasYears = yearsSortedDescending.length > 0;

  if (!hasTags && !hasYears) {
    return null;
  }

  return (
    <ul className="microblog-sidebar">
      {hasTags ? (
        <li>
          <Link
            className={cx(isTagListCurrent && "is-active")}
            href={routeMicroblogTagList.build({})}
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
                    href={routeMicroblogTag.build({ tag, page: null })}
                  >
                    {tag}
                  </Link>
                  &nbsp;<span className="no-wrap">({items.length})</span>
                </li>
              ))}
            {tagsDescendingByArticleCount.length > MAX_TAGS ? (
              <li>
                <Link href={routeMicroblogTagList.build({})}>
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
            href={routeMicroblogYearList.build({})}
          >
            Years
          </Link>

          <ul>
            {yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Link
                  className={cx(currentYear === year && "is-active")}
                  href={routeMicroblogYear.build({ year, page: null })}
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
