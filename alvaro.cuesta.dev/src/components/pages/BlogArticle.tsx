import { Template } from "../Template";
import { Link } from "../atoms/Link";
import { BlogListsLayout } from "../molecules/BlogListsLayout";
import { useBlogItems } from "../../blog/promise";
import React from "react";
import {
  blogItemDateToUTCISO8601Z,
  equalsBlogItemDates,
} from "../../blog/item-dates";
import type { SiteRenderMeta } from "../../site";
import { BlogDateTime } from "../atoms/BlogDateTime";
import { Icon } from "../atoms/Icon";
import { BlogArticleContent } from "../molecules/BlogArticleContent";
import { routeBlogArticle, routeBlogTag } from "../../routes";
import { makeTitle } from "../../utils/meta";

type BlogArticleProps = {
  siteRenderMeta: SiteRenderMeta;
  slug: string;
};

export const BlogArticle: React.FC<BlogArticleProps> = ({
  siteRenderMeta,
  slug,
}) => {
  const blogItems = useBlogItems();

  const article = blogItems.bySlug.get(slug);

  if (article === undefined) {
    throw new Error(`Article ${slug} not found`);
  }

  const {
    module: {
      title: articleTitle,
      publicationDate,
      lastModificationDate: lastModificationDateRaw,
      draft,
      tags,
    },
  } = article;

  const lastModificationDate =
    lastModificationDateRaw &&
    !equalsBlogItemDates(publicationDate, lastModificationDateRaw)
      ? lastModificationDateRaw
      : null;

  const lastModificationDateISOZ = lastModificationDate
    ? blogItemDateToUTCISO8601Z(lastModificationDate)
    : null;

  const articlePath = routeBlogArticle.build({ slug });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", articleTitle]),
        socialTitle: articleTitle,
        socialDescription:
          tags.length >= 3
            ? `Read about ${tags.slice(0, 2).join(", ")}, and more in this article by Álvaro Cuesta.`
            : tags.length === 2
              ? `Read about ${tags[0]} and ${tags[1]} in this article by Álvaro Cuesta.`
              : tags.length === 1
                ? `Read about ${tags[0]} in this article by Álvaro Cuesta.`
                : "Read this article by Álvaro Cuesta.",
        openGraph: {
          type: "article",
          authorProfileUrl: siteRenderMeta.baseUrl,
          tags,
        },
        additional: (
          <>
            <meta
              property="article:published_time"
              content={blogItemDateToUTCISO8601Z(publicationDate)}
            />
            {lastModificationDateISOZ !== null ? (
              <>
                <meta
                  property="article:modified_time"
                  content={lastModificationDateISOZ}
                />
                <meta
                  property="og:updated_time"
                  content={lastModificationDateISOZ}
                />
              </>
            ) : null}
          </>
        ),
      }}
    >
      <BlogListsLayout
        breadcrumbs={[{ name: articleTitle, href: articlePath }]}
        blogItems={blogItems}
      >
        <header>
          <div>
            <h2 className="no-underline">
              <Link href={articlePath}>{articleTitle}</Link>
              {draft ? " (draft)" : ""}
            </h2>
          </div>

          <div className="icon-field">
            <Icon fixedWidth name="calendar" title="Publication date" />{" "}
            <BlogDateTime dateTime={publicationDate} />
          </div>

          {tags.length > 0 && (
            <div className="icon-field">
              <Icon fixedWidth name="tags" title="Tags" />{" "}
              <span>
                {tags.map((tag, index) => (
                  <React.Fragment key={tag}>
                    {index > 0 && ", "}
                    <Link href={routeBlogTag.build({ tag })}>{tag}</Link>
                  </React.Fragment>
                ))}
              </span>
            </div>
          )}
        </header>

        <BlogArticleContent article={article} />

        {lastModificationDate ? (
          <footer>
            <i>
              (Last updated on <BlogDateTime dateTime={lastModificationDate} />)
            </i>
          </footer>
        ) : null}
      </BlogListsLayout>
    </Template>
  );
};
