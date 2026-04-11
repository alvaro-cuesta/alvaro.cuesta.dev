import React from "react";
import { makeMdxDefaultComponents } from "../mdx/mdx";
import { blogItemDateToTemporalInstant, type BlogItemDate } from "./item-dates";
import type { FeedSourceItem } from "../plugins/feeds/types";
import { renderToString } from "xenon-ssg/src/render";
import type { MDXContent } from "mdx/types";
import type { AnalyzedItems, Item } from "./analyze";

type RenderContentItemHtmlOptions = {
  baseUrl: string;
  pathname: string;
  Component: MDXContent;
};

export function renderContentItemHtml({
  baseUrl,
  pathname,
  Component,
}: RenderContentItemHtmlOptions): Promise<string> {
  const url = new URL(pathname, baseUrl);

  return renderToString(
    React.createElement(Component, {
      components: makeMdxDefaultComponents({
        canonicalizeBaseUrl: url,
        suppressTableOfContents: true,
        renderAnchor: (props) => <a {...props} />,
        renderHashtag: ({ href, children }) => <a href={href}>#{children}</a>,
      }),
    }),
  );
}

type BuildFeedSourceItemOptions = {
  pathname: string;
  title: string;
  summary?: string | undefined;
  render: () => string | Promise<string>;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  tags: string[];
};

export function buildFeedSourceItem({
  pathname,
  title,
  summary,
  render,
  publicationDate,
  lastModificationDate,
  tags,
}: BuildFeedSourceItemOptions): FeedSourceItem {
  return {
    pathname,
    title,
    ...(summary ? { summary } : {}),
    render,
    datePublished: blogItemDateToTemporalInstant(publicationDate),
    ...(lastModificationDate
      ? {
          dateModified: blogItemDateToTemporalInstant(lastModificationDate),
        }
      : {}),
    ...(tags.length ? { tags } : {}),
  };
}

type FeedSource = (baseUrl: string) => Promise<FeedSourceItem[]>;

export function createFeedSource<TModuleParsed>(
  getAnalyzedItems: () => Promise<AnalyzedItems<TModuleParsed>>,
  toFeedSourceItem: (
    baseUrl: string,
    item: Item<TModuleParsed>,
  ) => FeedSourceItem | Promise<FeedSourceItem>,
): FeedSource {
  return async (baseUrl: string): Promise<FeedSourceItem[]> => {
    const analyzed = await getAnalyzedItems();
    return Promise.all(
      analyzed.allSortedByDescendingDate.map((item) =>
        toFeedSourceItem(baseUrl, item),
      ),
    );
  };
}
