import type { Temporal } from "temporal-polyfill";

export type FeedAuthor =
  | {
      name: string;
      url?: string;
    }
  | {
      name?: string;
      url: string;
    };

export type FeedItem = {
  id?: string;
  url?: string;
  title?: string;
  summary?: string;
  contentHtml?: string;
  contentText?: string;
  datePublished?: Temporal.Instant;
  dateModified?: Temporal.Instant;
  authors?: FeedAuthor[];
  tags?: string[];
};

export type FeedSourceItem = {
  id?: string;
  pathname: string;
  title: string;
  summary?: string;
  render: () => string | Promise<string>;
  datePublished: Temporal.Instant;
  dateModified?: Temporal.Instant;
  authors?: FeedAuthor[];
  tags?: string[];
};

export type FeedFormat = "jsonfeed" | "atom" | "rss";

export type FeedFormatRoute = {
  pathname: string;
  outputRelativePath: string;
  contentType: string;
};

export type FeedPageRoutes = Record<FeedFormat, FeedFormatRoute>;

export type FeedPage = {
  currentPage: number;
  totalPages: number;
  title: string;
  description?: string;
  baseUrl: string;
  homePageUrl?: string;
  updated?: Temporal.Instant;
  authors?: FeedAuthor[];
  items: FeedItem[];
  routes: FeedPageRoutes;
  previousPage: FeedPageRoutes | null;
  nextPage: FeedPageRoutes | null;
};

export type FeedContentInclusionMode = "full" | "summary" | "none";

export type FeedContentOptions = {
  html?: FeedContentInclusionMode;
  text?: FeedContentInclusionMode;
};
