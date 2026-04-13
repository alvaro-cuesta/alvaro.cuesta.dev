import { getBlogItems } from "../../blog/promise";
import { BlogLayout } from "./components/BlogLayout";
import { Template } from "../../components/Template";
import { Link } from "../../components/atoms/Link";
import type { SiteRenderMeta } from "../../site";
import { routeBlogTag } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config";

type BlogTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function BlogTagList({ siteRenderMeta }: BlogTagListProps) {
  const blogItems = await getBlogItems();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", "All tags"]),
        description: BLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Blog"]),
        socialDescription: makeBlogBlurbSocialDescription("tags"),
        openGraph: { type: "website" },
      }}
    >
      <BlogLayout blogItems={blogItems} isTagListCurrent>
        <h2>Blog tags</h2>

        <article>
          <ul>
            {blogItems.tagsAscendingAlphabetically.map(({ tag, items }) => (
              <li key={tag}>
                <Link href={routeBlogTag.build({ tag })}>{tag}</Link> (
                {items.length})
              </li>
            ))}
          </ul>
        </article>
      </BlogLayout>
    </Template>
  );
}
