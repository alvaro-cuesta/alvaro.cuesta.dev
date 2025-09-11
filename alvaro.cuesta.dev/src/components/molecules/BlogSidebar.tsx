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
};

const MAX_TAGS = 10;

export const BlogSidebar: React.FC<BlogSidebarProps> = ({ blogItems }) => {
  const { tagsDescendingByArticleCount, yearsSortedDescending } = blogItems;

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
          <Link href={routeBlogTagList.build({})}>Tags</Link>

          <ul>
            {tagsDescendingByArticleCount
              .slice(0, MAX_TAGS)
              .map(({ tag, items }) => (
                <li key={tag}>
                  <Link href={routeBlogTag.build({ tag })}>{tag}</Link>&nbsp;(
                  {items.length})
                </li>
              ))}
            {tagsDescendingByArticleCount.length > MAX_TAGS ? (
              <li>
                <Link href={routeBlogTagList.build({})}>More...</Link>
              </li>
            ) : null}
          </ul>
        </li>
      ) : null}
      {hasYears ? (
        <li>
          <Link href={routeBlogYearList.build({})}>Years</Link>

          <ul>
            {yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Link href={routeBlogYear.build({ year })}>{year}</Link>&nbsp;(
                {data.totalCount})
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
};
