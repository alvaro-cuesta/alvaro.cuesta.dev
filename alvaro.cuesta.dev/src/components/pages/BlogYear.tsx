import { useBlogItems } from "../../blog/promise";
import { Template } from "../Template";
import { BlogListsLayout } from "../molecules/BlogListsLayout";
import { BlogArticleListItem } from "../molecules/BlogArticleListItem";
import { type BlogItemMonth } from "../../blog/item-dates";
import type { SiteRenderMeta } from "../../site";
import { routeBlogYear, routeBlogYearList } from "../../routes";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config";
import { makeTitle } from "../../utils/meta";

type BlogYearProps = {
  siteRenderMeta: SiteRenderMeta;
  year: number;
};

const MONTH_NUMBER_TO_NAME: {
  [Month in Exclude<BlogItemMonth, null>]: string;
} = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const NULL_MONTH_TO_NAME = "Other";

export const BlogYear: React.FC<BlogYearProps> = ({ siteRenderMeta, year }) => {
  const blogItems = useBlogItems();

  const yearInfo = blogItems.byYear.get(year);
  if (yearInfo === undefined) {
    throw new Error(`Year ${year} not found`);
  }

  const monthsSortedByDescending = [...yearInfo.byMonth.entries()]
    .map(([month, items]) => ({ month, items }))
    .sort((a, b) =>
      a.month === null && b.month === null
        ? 0
        : a.month === null
          ? 1
          : b.month === null
            ? -1
            : b.month - a.month,
    );

  // TODO: Pagination?

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", `Year ${year}`]),
        description: BLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Blog"]),
        socialDescription: makeBlogBlurbSocialDescription(`year ${year}`),
        openGraph: { type: "website" },
      }}
    >
      <BlogListsLayout
        breadcrumbs={[
          { name: "Years", href: routeBlogYearList.build({}) },
          { name: year.toString(), href: routeBlogYear.build({ year }) },
        ]}
        blogItems={blogItems}
      >
        <h2>Year {year}</h2>

        <ul>
          {monthsSortedByDescending.map(({ month, items }) => {
            const monthName =
              month !== null ? MONTH_NUMBER_TO_NAME[month] : NULL_MONTH_TO_NAME;

            return (
              <li key={month}>
                <h3>{monthName}</h3>
                <ul>
                  {items.map((item) => (
                    <BlogArticleListItem key={item.filename} item={item} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </BlogListsLayout>
    </Template>
  );
};
