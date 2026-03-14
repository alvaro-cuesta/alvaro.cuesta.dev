import { create } from "xmlbuilder2";
import { instantToUtcIso8601 } from "./dates";
import { FEED_FORMATS, getRouteUrl } from "./routes";
import type { FeedAuthor, FeedItem, FeedPage } from "./types";

type AtomTextType = "text" | "html" | "xhtml";

type AtomTextConstruct = {
  value: string;
  type?: AtomTextType;
};

type AtomPerson = {
  name: string;
  uri?: string;
  email?: string;
};

type AtomLink = {
  href: string;
  rel?: string;
  type?: string;
  hreflang?: string;
  title?: string;
  length?: string;
};

type AtomCategory = {
  term: string;
  scheme?: string;
  label?: string;
};

type AtomContent =
  | {
      value: string;
      type?: AtomTextType | `${string}/${string}`;
      src?: never;
    }
  | {
      src: string;
      type?: `${string}/${string}`;
      value?: never;
    };

type AtomSource = {
  authors?: AtomPerson[];
  categories?: AtomCategory[];
  contributors?: AtomPerson[];
  generator?: AtomGenerator;
  icon?: string;
  id?: string;
  links?: AtomLink[];
  logo?: string;
  rights?: AtomTextConstruct;
  subtitle?: AtomTextConstruct;
  title?: AtomTextConstruct;
  updated?: string;
};

type AtomEntry = {
  title: AtomTextConstruct;
  id: string;
  links?: AtomLink[];
  summary?: AtomTextConstruct;
  content?: AtomContent;
  published?: string;
  updated: string;
  authors?: AtomPerson[];
  categories?: AtomCategory[];
  contributors?: AtomPerson[];
  rights?: AtomTextConstruct;
  source?: AtomSource;
};

type AtomFeedDocument = {
  title: AtomTextConstruct;
  id: string;
  updated: string;
  subtitle?: AtomTextConstruct;
  links?: AtomLink[];
  authors?: AtomPerson[];
  categories?: AtomCategory[];
  contributors?: AtomPerson[];
  generator?: AtomGenerator;
  icon?: string;
  logo?: string;
  rights?: AtomTextConstruct;
  entries: AtomEntry[];
};

type AtomGenerator = {
  value: string;
  version?: string;
  uri?: string;
};

const requireFeedField = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

const toAtomPerson = (author: FeedAuthor): AtomPerson => {
  return {
    name: requireFeedField(
      author.name ?? author.url,
      "Atom authors require a name or url.",
    ),
    ...(author.url ? { uri: author.url } : {}),
  };
};

const toAtomEntry = (item: FeedItem): AtomEntry => {
  const updated = requireFeedField(
    item.dateModified ?? item.datePublished,
    "Atom entries require updated or published dates.",
  );

  return {
    title: {
      value: requireFeedField(item.title, "Atom entries require a title."),
    },
    id: requireFeedField(item.id, "Atom entries require an id."),
    ...(item.url
      ? {
          links: [
            {
              rel: "alternate",
              type: "text/html",
              href: item.url,
            },
          ],
        }
      : {}),
    ...(item.summary !== undefined
      ? {
          summary: {
            value: item.summary,
          },
        }
      : {}),
    ...(item.contentHtml !== undefined
      ? {
          content: {
            type: "html",
            value: item.contentHtml,
          },
        }
      : item.contentText !== undefined
        ? {
            content: {
              value: item.contentText,
            },
          }
        : {}),
    ...(item.datePublished
      ? { published: instantToUtcIso8601(item.datePublished) }
      : {}),
    updated: instantToUtcIso8601(updated),
    ...(item.authors?.length
      ? {
          authors: item.authors.map((author) => toAtomPerson(author)),
        }
      : {}),
    ...(item.tags?.length
      ? {
          categories: item.tags.map((tag) => ({ term: tag })),
        }
      : {}),
  };
};

const toAtomDocument = (
  page: FeedPage,
  generator: AtomGenerator,
): AtomFeedDocument => {
  const links: AtomLink[] = [
    {
      rel: "self",
      type: FEED_FORMATS.atom.contentType,
      href: getRouteUrl(page.baseUrl, page.routes.atom),
    },
  ];

  if (page.homePageUrl) {
    links.unshift({
      rel: "alternate",
      type: "text/html",
      href: page.homePageUrl,
    });
  }

  if (page.previousPage) {
    links.push({
      rel: page.currentPage === 2 ? "previous" : "prev-archive",
      type: FEED_FORMATS.atom.contentType,
      href: getRouteUrl(page.baseUrl, page.previousPage.atom),
    });
  }

  if (page.nextPage) {
    links.push({
      rel: page.currentPage === 1 ? "next" : "next-archive",
      type: FEED_FORMATS.atom.contentType,
      href: getRouteUrl(page.baseUrl, page.nextPage.atom),
    });
  }

  return {
    title: {
      value: page.title,
    },
    id: getRouteUrl(page.baseUrl, page.routes.atom),
    updated: instantToUtcIso8601(
      requireFeedField(page.updated, "Atom feeds require an updated date."),
    ),
    ...(page.description
      ? {
          subtitle: {
            value: page.description,
          },
        }
      : {}),
    ...(links.length ? { links } : {}),
    ...(page.authors?.length
      ? {
          authors: page.authors.map((author) => toAtomPerson(author)),
        }
      : {}),
    generator,
    entries: page.items.map((item) => toAtomEntry(item)),
  };
};

export const serializeAtomDocument = (
  page: FeedPage,
  language: string,
  generator: AtomGenerator,
): string => {
  const document = toAtomDocument(page, generator);
  const root = create({ version: "1.0", encoding: "UTF-8" });
  const feed = root.ele("feed", {
    xmlns: "http://www.w3.org/2005/Atom",
    "xml:lang": language,
    "xmlns:fh": "http://purl.org/syndication/history/1.0",
  });

  feed
    .ele("title", document.title.type ? { type: document.title.type } : {})
    .txt(document.title.value);
  feed.ele("id").txt(document.id);
  feed.ele("updated").txt(document.updated);

  if (document.subtitle) {
    feed
      .ele(
        "subtitle",
        document.subtitle.type ? { type: document.subtitle.type } : {},
      )
      .txt(document.subtitle.value);
  }

  if (document.generator) {
    feed
      .ele("generator", {
        ...(document.generator.version
          ? { version: document.generator.version }
          : {}),
        ...(document.generator.uri ? { uri: document.generator.uri } : {}),
      })
      .txt(document.generator.value);
  }

  if (page.currentPage > 1) {
    feed.ele("fh:archive");
  }

  if (document.links) {
    for (const link of document.links) {
      feed.ele("link", {
        href: link.href,
        ...(link.rel ? { rel: link.rel } : {}),
        ...(link.type ? { type: link.type } : {}),
        ...(link.hreflang ? { hreflang: link.hreflang } : {}),
        ...(link.title ? { title: link.title } : {}),
        ...(link.length ? { length: link.length } : {}),
      });
    }
  }

  if (document.authors) {
    for (const author of document.authors) {
      const atomAuthor = feed.ele("author");
      atomAuthor.ele("name").txt(author.name);

      if (author.uri) {
        atomAuthor.ele("uri").txt(author.uri);
      }
    }
  }

  for (const entry of document.entries) {
    const atomEntry = feed.ele("entry");
    atomEntry
      .ele("title", entry.title.type ? { type: entry.title.type } : {})
      .txt(entry.title.value);
    atomEntry.ele("id").txt(entry.id);

    if (entry.published) {
      atomEntry.ele("published").txt(entry.published);
    }

    atomEntry.ele("updated").txt(entry.updated);

    if (entry.links) {
      for (const link of entry.links) {
        atomEntry.ele("link", {
          href: link.href,
          ...(link.rel ? { rel: link.rel } : {}),
          ...(link.type ? { type: link.type } : {}),
          ...(link.hreflang ? { hreflang: link.hreflang } : {}),
          ...(link.title ? { title: link.title } : {}),
          ...(link.length ? { length: link.length } : {}),
        });
      }
    }

    if (entry.summary) {
      const summary = atomEntry.ele(
        "summary",
        entry.summary.type ? { type: entry.summary.type } : {},
      );
      summary.txt(entry.summary.value);
    }

    if (entry.content) {
      const content = atomEntry.ele("content", {
        ...(entry.content.type ? { type: entry.content.type } : {}),
        ...(entry.content.src ? { src: entry.content.src } : {}),
      });

      if (entry.content.value !== undefined) {
        content.txt(entry.content.value);
      }
    }

    if (entry.authors) {
      for (const author of entry.authors) {
        const atomAuthor = atomEntry.ele("author");
        atomAuthor.ele("name").txt(author.name);

        if (author.uri) {
          atomAuthor.ele("uri").txt(author.uri);
        }
      }
    }

    if (entry.categories) {
      for (const category of entry.categories) {
        atomEntry.ele("category", { term: category.term });
      }
    }
  }

  return root.end();
};
