import { BlogListsLayout } from "../molecules/BlogListsLayout";
import { Template } from "../Template";
import { useBlogItems } from "../../blog/promise";
import { BlogArticleListItem } from "../molecules/BlogArticleListItem";
import type { SiteRenderMeta } from "../../site";
import { routeBlogTag, routeBlogTagList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config";

type BlogTagProps = {
  siteRenderMeta: SiteRenderMeta;
  tag: string;
};

export const BlogTag: React.FC<BlogTagProps> = ({ siteRenderMeta, tag }) => {
  const blogItems = useBlogItems();

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
      <BlogListsLayout
        breadcrumbs={[
          { name: "Tags", href: routeBlogTagList.build({}) },
          { name: tag, href: routeBlogTag.build({ tag }) },
        ]}
        blogItems={blogItems}
      >
        <h2>Tag "{tag}"</h2>

        <ul>
          {itemsInTag.map((item) => (
            <BlogArticleListItem key={item.filename} item={item} />
          ))}
        </ul>
      </BlogListsLayout>
    </Template>
  );
};
