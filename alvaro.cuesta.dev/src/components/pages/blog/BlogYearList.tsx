import { getBlogItems } from "../../../blog/promise";
import { Template } from "../../Template";
import { BlogLayout } from "./components/BlogLayout";
import { Link } from "../../atoms/Link";
import type { SiteRenderMeta } from "../../../site";
import { routeBlogYear } from "../../../routes";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../../config";
import { makeTitle } from "../../../utils/meta";

type BlogYearListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function BlogYearList({ siteRenderMeta }: BlogYearListProps) {
  const blogItems = await getBlogItems();

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
      <BlogLayout blogItems={blogItems} isYearListCurrent>
        <h2>Blog years</h2>

        <article>
          <ul>
            {blogItems.yearsSortedDescending.map(({ year, data }) => (
              <li key={year}>
                <Link href={routeBlogYear.build({ year })}>{year}</Link> (
                {data.totalCount})
              </li>
            ))}
          </ul>
        </article>
      </BlogLayout>
    </Template>
  );
}
