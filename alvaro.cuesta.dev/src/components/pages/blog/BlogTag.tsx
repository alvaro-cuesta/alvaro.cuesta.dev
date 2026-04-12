import { BlogLayout } from "./components/BlogLayout";
import { Template } from "../../Template";
import { getBlogItems } from "../../../blog/promise";
import { BlogArticleListItem } from "./components/BlogArticleListItem";
import type { SiteRenderMeta } from "../../../site";
import { routeBlogTag, routeBlogTagList } from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../../config";

type BlogTagProps = {
  siteRenderMeta: SiteRenderMeta;
  tag: string;
};

export async function BlogTag({ siteRenderMeta, tag }: BlogTagProps) {
  const blogItems = await getBlogItems();

  const itemsInTag = blogItems.byTag.get(tag);

  if (itemsInTag === undefined) {
    throw new Error(`Tag ${tag} not found`);
  }

  // TODO: Pagination?

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", `Tag "${tag}"`]),
        description: BLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Blog"]),
        socialDescription: makeBlogBlurbSocialDescription(`tag ${tag}`),
        openGraph: { type: "website" },
      }}
    >
      <BlogLayout
        breadcrumbs={[
          { name: "Tags", href: routeBlogTagList.build({}) },
          { name: tag, href: routeBlogTag.build({ tag }) },
        ]}
        blogItems={blogItems}
        currentTags={[tag]}
        isTagListCurrent
      >
        <h2>Blog tag "{tag}"</h2>

        <article>
          <ul>
            {itemsInTag.map((item) => (
              <BlogArticleListItem key={item.filename} item={item} />
            ))}
          </ul>
        </article>
      </BlogLayout>
    </Template>
  );
}
