import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blogItemDateToTemporalInstant } from "./item-dates";
import { getBlogItems } from "./promise";
import { routeBlogArticle } from "../routes";
import { canonicalizeHref } from "xenon-ssg/src/url";
import type { FeedSourceItem } from "../plugins/feeds/types";
import type { BlogItem } from "./item";

function renderBlogItemHtml(baseUrl: string, item: BlogItem): string {
  const articlePathname = routeBlogArticle.build({ slug: item.module.slug });
  const articleUrl = new URL(articlePathname, baseUrl).toString();

  return renderToStaticMarkup(
    React.createElement(item.module.Component, {
      components: {
        a: (props: React.ComponentPropsWithoutRef<"a">) => {
          const href = props.href
            ? canonicalizeHref(
                props.href,
                new URL(articleUrl),
              ).pathUrl.toString()
            : props.href;

          return React.createElement("a", {
            ...props,
            href,
          });
        },
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
