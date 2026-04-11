import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blogItemDateToTemporalInstant } from "../utils/item-dates";
import { getMicroblogItems } from "./promise";
import { microblogPostId } from "./analyze";
import { makeMdxDefaultComponents } from "../mdx/mdx";
import { routeMicroblogPost } from "../routes";
import type { FeedSourceItem } from "../plugins/feeds/types";
import type { MicroblogItem } from "./item";
import { htmlToPlainText } from "../utils/html";

function renderMicroblogItemHtml(baseUrl: string, item: MicroblogItem): string {
  const postPathname = routeMicroblogPost.build({
    id: microblogPostId(item.filename),
  });
  const postUrl = new URL(postPathname, baseUrl);

  return renderToStaticMarkup(
    React.createElement(item.module.Component, {
      components: {
        ...makeMdxDefaultComponents({
          canonicalizeBaseUrl: postUrl,
          renderAnchor: (props) => <a {...props} />,
          renderHashtag: ({ href, children }) => (
            <a href={href}>#{children}</a>
          ),
        }),
      },
    }),
  );
}

const EXCERPT_LENGTH = 40;

function makeExcerptTitle(html: string): string {
  const text = htmlToPlainText(html).replace(/\n/g, " ").trim();

  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }

  return `${text.slice(0, EXCERPT_LENGTH)}…`;
}

function toFeedSourceItem(
  baseUrl: string,
  item: MicroblogItem,
): FeedSourceItem {
  const html = renderMicroblogItemHtml(baseUrl, item);
  const title = makeExcerptTitle(html);

  return {
    pathname: routeMicroblogPost.build({
      id: microblogPostId(item.filename),
    }),
    title,
    render: () => html,
    datePublished: blogItemDateToTemporalInstant(item.module.publicationDate),
    ...(item.module.lastModificationDate
      ? {
          dateModified: blogItemDateToTemporalInstant(
            item.module.lastModificationDate,
          ),
        }
      : {}),
    ...(item.module.tags.length ? { tags: item.module.tags } : {}),
  };
}

export async function getMicroblogFeedSourceItems(
  baseUrl: string,
): Promise<FeedSourceItem[]> {
  const microblogItems = await getMicroblogItems();

  return microblogItems.allSortedByDescendingDate.map((item) =>
    toFeedSourceItem(baseUrl, item),
  );
}

export async function getMicroblogFeedItemCount(): Promise<number> {
  const microblogItems = await getMicroblogItems();

  return microblogItems.allSortedByDescendingDate.length;
}
