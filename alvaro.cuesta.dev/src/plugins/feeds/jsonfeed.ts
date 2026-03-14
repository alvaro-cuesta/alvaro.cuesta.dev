import { getRouteUrl } from "./routes";
import { instantToUtcIso8601 } from "./dates";
import type { FeedFormatRoute, FeedItem, FeedPage } from "./types";

type JsonFeedExtensionMap = {
  [k in `_${string}`]?: unknown;
};

type JsonFeedAuthor = {
  name?: string;
  url?: string;
  avatar?: string;
} & ({ name: string } | { url: string } | { avatar: string }) &
  JsonFeedExtensionMap;

type JsonFeedHub = {
  type: string;
  url: string;
} & JsonFeedExtensionMap;

type JsonFeedAttachment = {
  url: string;
  mime_type: string;
  title?: string;
  size_in_bytes?: number;
  duration_in_seconds?: number;
} & JsonFeedExtensionMap;

type JsonFeedItem = {
  id: string;
  url?: string;
  external_url?: string;
  title?: string;
  content_html?: string;
  content_text?: string;
  summary?: string;
  image?: string;
  banner_image?: string;
  date_published?: string;
  date_modified?: string;
  author?: JsonFeedAuthor;
  authors?: JsonFeedAuthor[];
  tags?: string[];
  language?: string;
  attachments?: JsonFeedAttachment[];
} & ({ content_html: string } | { content_text: string }) &
  JsonFeedExtensionMap;

type JsonFeedV1_1 = {
  version: "https://jsonfeed.org/version/1.1";
  title: string;
  home_page_url?: string;
  feed_url?: string;
  description?: string;
  user_comment?: string;
  next_url?: string;
  icon?: string;
  favicon?: string;
  author?: JsonFeedAuthor;
  authors?: JsonFeedAuthor[];
  language?: string;
  expired?: boolean;
  hubs?: JsonFeedHub[];
  items: JsonFeedItem[];
} & JsonFeedExtensionMap;

const requireFeedField = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

const toJsonFeedAuthor = (author: {
  name?: string;
  url?: string;
}): JsonFeedAuthor => {
  if (author.name) {
    return {
      name: author.name,
      ...(author.url ? { url: author.url } : {}),
    };
  }

  return {
    url: requireFeedField(
      author.url,
      "JSON Feed authors require at least a name or url.",
    ),
  };
};

const toJsonFeedItem = (item: FeedItem, language: string): JsonFeedItem => {
  const baseItem = {
    id: requireFeedField(item.id, "JSON Feed items require an id."),
    ...(item.url ? { url: item.url } : {}),
    ...(item.title ? { title: item.title } : {}),
    ...(item.summary !== undefined ? { summary: item.summary } : {}),
    ...(item.datePublished
      ? { date_published: instantToUtcIso8601(item.datePublished) }
      : {}),
    ...(item.dateModified
      ? { date_modified: instantToUtcIso8601(item.dateModified) }
      : {}),
    ...(item.authors?.length
      ? {
          authors: item.authors.map((author) => toJsonFeedAuthor(author)),
        }
      : {}),
    ...(item.tags?.length ? { tags: item.tags } : {}),
    language,
  };

  if (item.contentHtml !== undefined && item.contentText !== undefined) {
    return {
      ...baseItem,
      content_html: item.contentHtml,
      content_text: item.contentText,
    };
  } else if (item.contentHtml !== undefined) {
    return {
      ...baseItem,
      content_html: item.contentHtml,
    };
  } else if (item.contentText !== undefined) {
    return {
      ...baseItem,
      content_text: item.contentText,
    };
  } else if (item.summary !== undefined) {
    return {
      ...baseItem,
      content_text: item.summary,
    };
  } else {
    throw new Error(
      `JSON Feed item ${item.id} requires contentHtml, contentText, or summary.`,
    );
  }
};

const toJsonFeed = (
  page: FeedPage,
  language: string,
  feedRoute: FeedFormatRoute,
  nextRoute: FeedFormatRoute | null,
): JsonFeedV1_1 => {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: page.title,
    ...(page.homePageUrl ? { home_page_url: page.homePageUrl } : {}),
    feed_url: getRouteUrl(page.baseUrl, feedRoute),
    ...(page.description ? { description: page.description } : {}),
    ...(nextRoute
      ? {
          next_url: getRouteUrl(page.baseUrl, nextRoute),
        }
      : {}),
    ...(page.authors?.length
      ? {
          authors: page.authors.map((author) => toJsonFeedAuthor(author)),
        }
      : {}),
    language,
    items: page.items.map((item) => toJsonFeedItem(item, language)),
  };
};

export const serializeJsonDocuments = (
  page: FeedPage,
  language: string,
): string => {
  return JSON.stringify(
    toJsonFeed(
      page,
      language,
      page.routes.jsonfeed,
      page.nextPage?.jsonfeed ?? null,
    ),
  );
};
