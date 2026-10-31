import { makeMdxDefaultComponents } from "../mdx/mdx.tsx";
import { MdxRenderContext } from "../mdx/MdxRenderContext.tsx";
import { blogItemDateToTemporalInstant, type BlogItemDate } from "./item-dates.ts";
import type { FeedSourceItem } from "@xenon-ssg/express-plugin-feeds";
import { renderToString } from "@xenon-ssg/core/render";
import type { MDXContent } from "mdx/types.js";
import type { AnalyzedItems, Item } from "./analyze.ts";
import { read, type Thunk } from "@xenon-ssg/thunks";

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
    <MdxRenderContext value={{
      pathname,
      canonicalizeBaseUrl: url,
    }}>
      <Component
        components={makeMdxDefaultComponents({
          canonicalizeBaseUrl: url,
          renderAnchor: (props) => <a {...props} />,
          renderHashtag: ({ href, children }) => <a href={href}>#{children}</a>,
        })}
      />
    </MdxRenderContext>,
  );
}

type BuildFeedSourceItemOptions<TMetadata = unknown> = {
  pathname: string;
  title: string;
  summary?: string | undefined;
  render: () => string | Promise<string>;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  tags: string[];
  metadata?: TMetadata;
};

export function buildFeedSourceItem<TMetadata = unknown>({
  pathname,
  title,
  summary,
  render,
  publicationDate,
  lastModificationDate,
  tags,
  metadata,
}: BuildFeedSourceItemOptions<TMetadata>): FeedSourceItem<TMetadata> {
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
    ...(metadata !== undefined ? { metadata } : {}),
  } as FeedSourceItem<TMetadata>;
}

// Made again on every call, not derived: making a feed item may render it, and
// rendering reads thunks without `get`, so a derived couldn't tell when its
// items went stale.
export function createFeedSource<TModuleParsed, const TMetadata = unknown>(
  collection: Thunk<AnalyzedItems<TModuleParsed>>,
  toFeedSourceItem: (
    baseUrl: string,
    item: Item<TModuleParsed>,
  ) => FeedSourceItem<TMetadata> | Promise<FeedSourceItem<TMetadata>>,
): (baseUrl: string) => Promise<FeedSourceItem<TMetadata>[]> {
  return async (baseUrl: string): Promise<FeedSourceItem<TMetadata>[]> => {
    const analyzed = await read(collection);
    return Promise.all(
      analyzed.allSortedByDescendingDate.map((item) =>
        toFeedSourceItem(baseUrl, item),
      ),
    );
  };
}
