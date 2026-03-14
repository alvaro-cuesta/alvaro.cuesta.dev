import { htmlToPlainText } from "../../blog/html";
import { compareInstants } from "./dates";
import { getFeedFormatRoute, toAbsoluteUrl } from "./routes";
import type {
  FeedAuthor,
  FeedContentOptions,
  FeedItem,
  FeedPage,
  FeedPageRoutes,
  FeedSourceItem,
} from "./types";

const chunk = <T>(items: T[], size: number): T[][] => {
  const pages: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }

  return pages;
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const summaryTextToHtml = (summary: string): string => {
  return summary
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
};

const getPageUpdatedAt = (items: FeedItem[]): FeedItem["datePublished"] => {
  const timestamps = items.flatMap((item) => {
    return [item.datePublished, item.dateModified].filter(
      Boolean,
    ) as NonNullable<FeedItem["datePublished"]>[];
  });

  return timestamps.reduce((latest, candidate) => {
    return compareInstants(candidate, latest) > 0 ? candidate : latest;
  });
};

const toFeedItemModel = async (
  baseUrl: string,
  item: FeedSourceItem,
  defaultAuthors: FeedAuthor[],
  content: Required<FeedContentOptions>,
): Promise<FeedItem> => {
  const url = toAbsoluteUrl(baseUrl, item.pathname);
  const summary = item.summary;
  const authors = item.authors ?? defaultAuthors;
  let fullContentHtml: string | undefined;
  let fullContentText: string | undefined;

  if (content.html === "full" || content.text === "full") {
    fullContentHtml = await item.render();

    if (content.text === "full") {
      fullContentText = htmlToPlainText(fullContentHtml);
    }
  }

  if ((content.html === "summary" || content.text === "summary") && !summary) {
    throw new Error(
      `Feed item ${item.pathname} requires a manual summary because feed content is configured to use summary mode.`,
    );
  }

  const contentHtml =
    content.html === "full"
      ? fullContentHtml
      : content.html === "summary" && summary !== undefined
        ? summaryTextToHtml(summary)
        : undefined;
  const contentText =
    content.text === "full"
      ? fullContentText
      : content.text === "summary" && summary !== undefined
        ? summary
        : undefined;

  return {
    id: item.id ?? url,
    url,
    title: item.title,
    ...(summary !== undefined ? { summary } : {}),
    ...(contentHtml !== undefined ? { contentHtml } : {}),
    ...(contentText !== undefined ? { contentText } : {}),
    datePublished: item.datePublished,
    ...(item.dateModified
      ? {
          dateModified: item.dateModified,
        }
      : {}),
    ...(authors.length ? { authors } : {}),
    ...(item.tags?.length ? { tags: item.tags } : {}),
  };
};

export const compileFeedPageModels = async ({
  baseUrl,
  mountPointFragments,
  itemsPerPage,
  title,
  description,
  homePagePathname,
  authors,
  content,
  getItems,
}: {
  baseUrl: string;
  mountPointFragments: string[];
  itemsPerPage: number;
  title: string;
  description: string;
  homePagePathname: string;
  authors: FeedAuthor[];
  content: Required<FeedContentOptions>;
  getItems: (context: { baseUrl: string }) => Promise<FeedSourceItem[]>;
}): Promise<FeedPage[]> => {
  const sourceItems = await getItems({ baseUrl });
  const pageAuthors = authors.length ? authors : undefined;
  const homePageUrl = toAbsoluteUrl(baseUrl, homePagePathname);

  const pagedItems = chunk(sourceItems, itemsPerPage);
  const pages: Promise<FeedPage>[] = pagedItems.map((items, index) => {
    const currentPage = index + 1;
    const routes: FeedPageRoutes = {
      jsonfeed: getFeedFormatRoute(
        mountPointFragments,
        currentPage,
        "jsonfeed",
      ),
      atom: getFeedFormatRoute(mountPointFragments, currentPage, "atom"),
      rss: getFeedFormatRoute(mountPointFragments, currentPage, "rss"),
    };
    const pageItems = Promise.all(
      items.map((item) => toFeedItemModel(baseUrl, item, authors, content)),
    );

    return pageItems.then((resolvedPageItems) => {
      const updated = getPageUpdatedAt(resolvedPageItems);

      return {
        currentPage,
        totalPages: pagedItems.length,
        title,
        description,
        baseUrl,
        homePageUrl,
        ...(updated ? { updated } : {}),
        ...(pageAuthors ? { authors: pageAuthors } : {}),
        items: resolvedPageItems,
        routes,
        previousPage: null,
        nextPage: null,
      };
    });
  });
  const resolvedPages = await Promise.all(pages);

  for (const page of resolvedPages) {
    page.previousPage = resolvedPages[page.currentPage - 2]?.routes ?? null;
    page.nextPage = resolvedPages[page.currentPage]?.routes ?? null;
  }

  return resolvedPages;
};
