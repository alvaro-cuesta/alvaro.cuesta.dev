import { Link } from "../atoms/Link";
import type { AnalyzedBlogItems } from "../../blog/analyze";
import {
  routeBlogTag,
  routeBlogTagList,
  routeBlogYear,
  routeBlogYearList,
} from "../../routes";
import { Wrapper } from "../atoms/Wrapper";

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
          <Wrapper
            wrapper={(children) =>
              isTagListCurrent ? <strong>{children}</strong> : <>{children}</>
            }
          >
            <Link href={routeBlogTagList.build({})}>Tags</Link>
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
                    <Link href={routeBlogTag.build({ tag })}>{tag}</Link>
                  </Wrapper>
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
          <Wrapper
            wrapper={(children) =>
              isYearListCurrent ? <strong>{children}</strong> : <>{children}</>
            }
          >
            <Link href={routeBlogYearList.build({})}>Years</Link>
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
                  <Link href={routeBlogYear.build({ year })}>{year}</Link>
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
