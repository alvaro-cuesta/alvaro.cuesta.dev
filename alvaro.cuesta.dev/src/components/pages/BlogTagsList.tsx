import { useBlogItems } from "../../blog/promise";
import { BlogListsLayout } from "../molecules/BlogListsLayout";
import { Template } from "../Template";
import { Link } from "../atoms/Link";
import type { SiteRenderMeta } from "../../site";
import { routeBlogTag, routeBlogTagList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  BLOG_BLURB_DESCRIPTION,
  makeBlogBlurbSocialDescription,
} from "../../../config";

type BlogTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const BlogTagList: React.FC<BlogTagListProps> = ({ siteRenderMeta }) => {
  const blogItems = useBlogItems();

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
      <BlogListsLayout
        breadcrumbs={[{ name: "Tags", href: routeBlogTagList.build({}) }]}
        blogItems={blogItems}
      >
        <h2>Tags</h2>

        <ul>
          {blogItems.tagsAscendingAlphabetically.map(({ tag, items }) => (
            <li key={tag}>
              <Link href={routeBlogTag.build({ tag })}>{tag}</Link> (
              {items.length})
            </li>
          ))}
        </ul>
      </BlogListsLayout>
    </Template>
  );
};
