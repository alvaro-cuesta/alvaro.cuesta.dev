import { useBlogItems } from "../../blog/promise";
import { Template } from "../Template";
import { BlogListsLayout } from "../molecules/BlogListsLayout";
import { Link } from "../atoms/Link";
import type { SiteRenderMeta } from "../../site";
import { routeBlogYear, routeBlogYearList } from "../../routes";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config";
import { makeTitle } from "../../utils/meta";

type BlogYearListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const BlogYearList: React.FC<BlogYearListProps> = ({
  siteRenderMeta,
}) => {
  const blogItems = useBlogItems();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", "All years"]),
        description: BLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Blog"]),
        socialDescription: makeBlogBlurbSocialDescription("articles by year"),
        openGraph: { type: "website" },
      }}
    >
      <BlogListsLayout
        breadcrumbs={[{ name: "Years", href: routeBlogYearList.build({}) }]}
        blogItems={blogItems}
      >
        <h2>Years</h2>

        <ul>
          {blogItems.yearsSortedDescending.map(({ year, data }) => (
            <li key={year}>
              <Link href={routeBlogYear.build({ year })}>{year}</Link> (
              {data.totalCount})
            </li>
          ))}
        </ul>
      </BlogListsLayout>
    </Template>
  );
};
