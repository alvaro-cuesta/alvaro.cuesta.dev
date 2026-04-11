import React from "react";
import { blogItemDateToTemporalInstant } from "../utils/item-dates";
import { getBlogItems } from "./promise";
import { makeMdxDefaultComponents } from "../mdx/mdx";
import { routeBlogArticle } from "../routes";
import type { FeedSourceItem } from "../plugins/feeds/types";
import type { BlogItem } from "./item";
import { renderToString } from "xenon-ssg/src/render";

function renderBlogItemHtml(
  baseUrl: string,
  item: BlogItem,
): Promise<string> {
  const articlePathname = routeBlogArticle.build({ slug: item.module.slug });
  const articleUrl = new URL(articlePathname, baseUrl);

  return renderToString(
    React.createElement(item.module.Component, {
      components: {
        ...makeMdxDefaultComponents({
          canonicalizeBaseUrl: articleUrl,
          renderAnchor: (props) => <a {...props} />,
        }),
        TableOfContents: () => null,
      },
    }),
  );
}

function toFeedSourceItem(baseUrl: string, item: BlogItem): FeedSourceItem {
  return {
    pathname: routeBlogArticle.build({ slug: item.module.slug }),
    title: item.module.title,
    ...(item.module.summary ? { summary: item.module.summary } : {}),
    render: () => renderBlogItemHtml(baseUrl, item),
    datePublished: blogItemDateToTemporalInstant(item.module.publicationDate),
    ...(item.module.lastModificationDate
      ? {
          dateModified: blogItemDateToTemporalInstant(
            item.module.lastModificationDate,
          ),
        }
      : {}),
    ...(item.module.tags.length
      ? { tags: item.module.tags.map((tag) => tag.slug) }
      : {}),
  };
}

export async function getBlogFeedSourceItems(
  baseUrl: string,
): Promise<FeedSourceItem[]> {
  const blogItems = await getBlogItems();

  return blogItems.allSortedByDescendingDate.map((item) =>
    toFeedSourceItem(baseUrl, item),
  );
}

export async function getBlogFeedItemCount(): Promise<number> {
  const blogItems = await getBlogItems();

  return blogItems.allSortedByDescendingDate.length;
}
