import { getBlogItems } from "../../blog/promise.ts";
import { Template } from "../../components/Template.tsx";
import { BlogLayout } from "./components/BlogLayout.tsx";
import { Link } from "../../components/atoms/Link.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { routeBlogYear } from "../../routes.ts";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config.ts";
import { makeTitle } from "../../utils/meta.ts";

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
