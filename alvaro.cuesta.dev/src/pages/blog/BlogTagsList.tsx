import { getBlogItems } from "../../blog/promise.ts";
import { BlogLayout } from "./components/BlogLayout.tsx";
import { Template } from "../../components/Template.tsx";
import { Link } from "../../components/atoms/Link.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { routeBlogTag } from "../../routes.ts";
import { makeTitle } from "../../utils/meta.ts";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config.ts";
import { read } from "@xenon-ssg/thunks";

type BlogTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export async function BlogTagList({ siteRenderMeta }: BlogTagListProps) {
  const blogItems = await read(getBlogItems);

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
