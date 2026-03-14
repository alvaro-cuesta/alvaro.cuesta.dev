import { create } from "xmlbuilder2";
import { instantToRfc822 } from "./dates";
import { FEED_FORMATS, getRouteUrl } from "./routes";
import type { FeedItem, FeedPage } from "./types";

type RssAtomLink = {
  href: string;
  rel: string;
  type: string;
};

type RssCategory = {
  value: string;
  domain?: string;
};

type RssGuid = {
  value: string;
  isPermaLink?: boolean;
};

type RssEnclosure = {
  url: string;
  length: string;
  type: string;
};

type RssSource = {
  value: string;
  url: string;
};

type RssCloud = {
  domain: string;
  port: string;
  path: string;
  registerProcedure: string;
  protocol: string;
};

type RssImage = {
  url: string;
  title: string;
  link?: string;
  width?: number;
  height?: number;
  description?: string;
};

type RssTextInput = {
  title: string;
  description: string;
  name: string;
  link: string;
};

type RssSkipDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type RssContentModule = {
  encoded?: string;
};

type RssItemDocument =
  | ({
      title: string;
      description?: string;
    } & {
      link?: string;
      author?: string;
      categories?: RssCategory[];
      comments?: string;
      enclosure?: RssEnclosure;
      guid?: RssGuid;
      pubDate?: string;
      source?: RssSource;
      content?: RssContentModule;
    })
  | ({
      title?: string;
      description: string;
    } & {
      link?: string;
      author?: string;
      categories?: RssCategory[];
      comments?: string;
      enclosure?: RssEnclosure;
      guid?: RssGuid;
      pubDate?: string;
      source?: RssSource;
      content?: RssContentModule;
    });

type RssFeedDocument = {
  title: string;
  link: string;
  description: string;
  language?: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  pubDate?: string;
  lastBuildDate?: string;
  categories?: RssCategory[];
  generator?: string;
  docs?: string;
  cloud?: RssCloud;
  ttl?: number;
  image?: RssImage;
  rating?: string;
  textInput?: RssTextInput;
  skipHours?: number[];
  skipDays?: RssSkipDay[];
  atomLinks?: RssAtomLink[];
  historyArchive?: boolean;
  items: RssItemDocument[];
};

const requireFeedField = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

const toRssItemDocument = (item: FeedItem): RssItemDocument => {
  const description =
    item.summary ?? (!item.title ? item.contentText : undefined);

  if (!item.title && !description) {
    throw new Error("RSS items require at least a title or description.");
  }

  return {
    ...(item.title ? { title: item.title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(item.url ? { link: item.url } : {}),
    ...(item.id
      ? {
          guid: {
            value: item.id,
            isPermaLink:
              item.id.startsWith("http://") || item.id.startsWith("https://"),
          },
        }
      : {}),
    ...(item.contentHtml !== undefined
      ? {
          content: {
            encoded: item.contentHtml,
          },
        }
      : {}),
    ...(item.datePublished
      ? { pubDate: instantToRfc822(item.datePublished) }
      : {}),
    ...(item.tags?.length
      ? {
          categories: item.tags.map((tag) => ({ value: tag })),
        }
      : {}),
  } as RssItemDocument;
};

const toRssDocument = (page: FeedPage, language: string): RssFeedDocument => {
  const atomLinks: RssAtomLink[] = [
    {
      rel: "self",
      type: FEED_FORMATS.rss.contentType,
      href: getRouteUrl(page.baseUrl, page.routes.rss),
    },
  ];

  if (page.previousPage) {
    atomLinks.push({
      rel: page.currentPage === 2 ? "previous" : "prev-archive",
      type: FEED_FORMATS.rss.contentType,
      href: getRouteUrl(page.baseUrl, page.previousPage.rss),
    });
  }

  if (page.nextPage) {
    atomLinks.push({
      rel: page.currentPage === 1 ? "next" : "next-archive",
      type: FEED_FORMATS.rss.contentType,
      href: getRouteUrl(page.baseUrl, page.nextPage.rss),
    });
  }

  return {
    title: page.title,
    link: requireFeedField(
      page.homePageUrl,
      "RSS feeds require a channel link.",
    ),
    description: requireFeedField(
      page.description,
      "RSS feeds require a channel description.",
    ),
    language,
    ...(page.updated ? { lastBuildDate: instantToRfc822(page.updated) } : {}),
    ...(atomLinks.length ? { atomLinks } : {}),
    ...(page.currentPage > 1 ? { historyArchive: true } : {}),
    items: page.items.map((item) => toRssItemDocument(item)),
  };
};

export const serializeRssDocument = (
  page: FeedPage,
  language: string,
): string => {
  const document = toRssDocument(page, language);
  const root = create({ version: "1.0", encoding: "UTF-8" });
  const rss = root.ele("rss", {
    version: "2.0",
    "xmlns:atom": "http://www.w3.org/2005/Atom",
    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
    "xmlns:fh": "http://purl.org/syndication/history/1.0",
  });
  const channel = rss.ele("channel");

  channel.ele("title").txt(document.title);
  channel.ele("link").txt(document.link);
  channel.ele("description").txt(document.description);
  if (document.language) {
    channel.ele("language").txt(document.language);
  }

  if (document.lastBuildDate) {
    channel.ele("lastBuildDate").txt(document.lastBuildDate);
  }

  if (document.historyArchive) {
    channel.ele("fh:archive");
  }

  if (document.atomLinks) {
    for (const link of document.atomLinks) {
      channel.ele("atom:link", {
        href: link.href,
        rel: link.rel,
        type: link.type,
      });
    }
  }

  for (const item of document.items) {
    const rssItem = channel.ele("item");
    if (item.title) {
      rssItem.ele("title").txt(item.title);
    }

    if (item.link) {
      rssItem.ele("link").txt(item.link);
    }

    if (item.guid) {
      rssItem
        .ele(
          "guid",
          item.guid.isPermaLink === undefined
            ? {}
            : { isPermaLink: String(item.guid.isPermaLink) },
        )
        .txt(item.guid.value);
    }

    if (item.description !== undefined) {
      rssItem.ele("description").txt(item.description);
    }

    if (item.content?.encoded !== undefined) {
      rssItem.ele("content:encoded").dat(item.content.encoded);
    }

    if (item.pubDate) {
      rssItem.ele("pubDate").txt(item.pubDate);
    }

    if (item.categories) {
      for (const category of item.categories) {
        rssItem
          .ele("category", category.domain ? { domain: category.domain } : {})
          .txt(category.value);
      }
    }
  }

  return root.end();
};
