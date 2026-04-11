import { Link } from "../atoms/Link";
import type { AnalyzedMicroblogItems } from "../../microblog/analyze";
import {
  routeMicroblogTag,
  routeMicroblogTagList,
  routeMicroblogYear,
  routeMicroblogYearList,
} from "../../routes";
import { Wrapper } from "../atoms/Wrapper";

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
          <Wrapper
            wrapper={(children) =>
              isTagListCurrent ? <strong>{children}</strong> : <>{children}</>
            }
          >
            <Link href={routeMicroblogTagList.build({})}>Tags</Link>
          </Wrapper>

          <ul>
            {tagsDescendingByArticleCount
              .slice(0, MAX_TAGS)
              .map(({ tag, items }) => (
                <li key={tag}>
                  <Wrapper
                    wrapper={(children) =>
                      currentTagsSet.has(tag) ? (
                        <strong>{children}</strong>
                      ) : (
                        <>{children}</>
                      )
                    }
                  >
                    <Link href={routeMicroblogTag.build({ tag })}>{tag}</Link>
                  </Wrapper>
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
          <Wrapper
            wrapper={(children) =>
              isYearListCurrent ? <strong>{children}</strong> : <>{children}</>
            }
          >
            <Link href={routeMicroblogYearList.build({})}>Years</Link>
          </Wrapper>

          <ul>
            {yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Wrapper
                  wrapper={(children) =>
                    currentYear === year ? (
                      <strong>{children}</strong>
                    ) : (
                      <>{children}</>
                    )
                  }
                >
                  <Link href={routeMicroblogYear.build({ year })}>{year}</Link>
                </Wrapper>
                &nbsp;<span className="no-wrap">({data.totalCount})</span>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
};
