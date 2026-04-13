import { Template } from "../../Template";
import { Link } from "../../atoms/Link";
import { BlogLayout } from "./components/BlogLayout";
import { getBlogItems } from "../../../blog/promise";
import React from "react";
import {
  blogItemDateToUTCISO8601Z,
  equalsBlogItemDates,
  getBlogItemDateYear,
} from "../../../utils/item-dates";
import type { SiteRenderMeta } from "../../../site";
import { BlogDateTime } from "../../atoms/BlogDateTime";
import { Icon } from "../../atoms/Icon";
import { routeBlogArticle, routeBlogTag } from "../../../routes";
import { makeTitle } from "../../../utils/meta";
import { MDX_DEFAULT_COMPONENTS } from "../../../mdx/mdx";

type BlogArticleProps = {
  siteRenderMeta: SiteRenderMeta;
  slug: string;
};

export async function BlogArticle({ siteRenderMeta, slug }: BlogArticleProps) {
  const blogItems = await getBlogItems();

  const article = blogItems.bySlug.get(slug);

  if (article === undefined) {
    throw new Error(`Article ${slug} not found`);
  }

  const {
    module: {
      title: articleTitle,
      summary,
      publicationDate,
      lastModificationDate: lastModificationDateRaw,
      draft,
      tags: tagsRaw,
    },
  } = article;

  const tagOriginals = tagsRaw.map((tag) => tag.original);
  const tagSlugs = tagsRaw.map((tag) => tag.slug);

  const lastModificationDate =
    lastModificationDateRaw &&
    !equalsBlogItemDates(publicationDate, lastModificationDateRaw)
      ? lastModificationDateRaw
      : null;

  const lastModificationDateISOZ = lastModificationDate
    ? blogItemDateToUTCISO8601Z(lastModificationDate)
    : null;

  const articlePath = routeBlogArticle.build({ slug });

  const description = summary
    ? summary
    : tagOriginals.length >= 3
      ? `Read about ${tagOriginals.slice(0, 2).join(", ")}, and more in this article by Álvaro Cuesta.`
      : tagOriginals.length === 2
        ? `Read about ${tagOriginals[0]} and ${tagOriginals[1]} in this article by Álvaro Cuesta.`
        : tagOriginals.length === 1
          ? `Read about ${tagOriginals[0]} in this article by Álvaro Cuesta.`
          : "Read this article by Álvaro Cuesta.";

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Blog", articleTitle]),
        description,
        socialTitle: articleTitle,
        socialDescription: description,
        openGraph: {
          type: "article",
          authorProfileUrl: siteRenderMeta.baseUrl,
          tags: tagSlugs,
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
      <BlogLayout
        blogItems={blogItems}
        currentTags={tagSlugs}
        currentYear={getBlogItemDateYear(publicationDate)}
        isTagListCurrent={tagSlugs.length > 0}
        isYearListCurrent
      >
        <article>
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

            {tagSlugs.length > 0 && (
              <div className="icon-field">
                <Icon fixedWidth name="tags" title="Tags" />{" "}
                <span>
                  {tagSlugs.map((tag, index) => (
                    <React.Fragment key={tag}>
                      {index > 0 && ", "}
                      <Link href={routeBlogTag.build({ tag })}>{tag}</Link>
                    </React.Fragment>
                  ))}
                </span>
              </div>
            )}
          </header>

          <section>
            <article.module.Component components={MDX_DEFAULT_COMPONENTS} />
          </section>

          {lastModificationDate ? (
            <footer>
              <i>
                (Last updated on{" "}
                <BlogDateTime dateTime={lastModificationDate} />)
              </i>
            </footer>
          ) : null}
        </article>
      </BlogLayout>
    </Template>
  );
}
