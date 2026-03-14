import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";
import { serializeAtomDocument } from "./atom";
import { serializeJsonDocuments } from "./jsonfeed";
import { serializeRssDocument } from "./rss";
import type { FeedPage } from "./types";

const routes = {
  jsonfeed: {
    pathname: "/blog/feed.json",
    outputRelativePath: "blog/feed.json",
    contentType: "application/feed+json",
  },
  atom: {
    pathname: "/blog/atom.xml",
    outputRelativePath: "blog/atom.xml",
    contentType: "application/atom+xml",
  },
  rss: {
    pathname: "/blog/feed.rss",
    outputRelativePath: "blog/feed.rss",
    contentType: "application/rss+xml",
  },
} as const;

describe("feed serializers", () => {
  it("omits optional JSON Feed fields when they are absent", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      authors: [{ name: "Example Author" }],
      items: [
        {
          id: "https://example.com/blog/post-1",
          title: "Post 1",
          contentText: "Plain text body",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = JSON.parse(serializeJsonDocuments(page, "en")) as {
      authors?: Array<{ name?: string; url?: string }>;
      items: Array<Record<string, unknown>>;
    };

    expect(document.authors).toEqual([{ name: "Example Author" }]);
    expect(document.items[0]).toMatchObject({
      id: "https://example.com/blog/post-1",
      title: "Post 1",
      content_text: "Plain text body",
      date_published: "2026-03-13T00:00:00Z",
      language: "en",
    });
    expect(document.items[0]).not.toHaveProperty("content_html");
    expect(document.items[0]).not.toHaveProperty("summary");
    expect(document.items[0]).not.toHaveProperty("authors");
    expect(document.items[0]).not.toHaveProperty("tags");
    expect(document.items[0]).not.toHaveProperty("attachments");
  });

  it("falls back to summary as content_text when content fields are omitted", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      items: [
        {
          id: "https://example.com/blog/post-1",
          title: "Post 1",
          summary: "Short summary only",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = JSON.parse(serializeJsonDocuments(page, "en")) as {
      items: Array<Record<string, unknown>>;
    };

    expect(document.items[0]).toMatchObject({
      summary: "Short summary only",
      content_text: "Short summary only",
    });
    expect(document.items[0]).not.toHaveProperty("content_html");
  });

  it("keeps empty content fields instead of treating them as missing", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      items: [
        {
          id: "https://example.com/blog/post-1",
          title: "Post 1",
          contentHtml: "",
          contentText: "",
          summary: "",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = JSON.parse(serializeJsonDocuments(page, "en")) as {
      items: Array<Record<string, unknown>>;
    };

    expect(document.items[0]).toMatchObject({
      content_html: "",
      content_text: "",
      summary: "",
    });
  });

  it("omits optional Atom entry fields when they are absent", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      authors: [{ name: "Example Author" }],
      items: [
        {
          id: "https://example.com/blog/post-1",
          url: "https://example.com/blog/post-1",
          title: "Post 1",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = serializeAtomDocument(page, "en", {
      value: "Example Generator",
      version: "1.0.0",
    });

    expect(document).toContain("<author><name>Example Author</name></author>");
    expect(document).not.toContain("<entry><author>");
    expect(document).not.toContain("<summary");
    expect(document).not.toContain("<content");
    expect(document).not.toContain("<category ");
  });

  it("serializes Atom authors with url-only fallback names", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      authors: [{ url: "https://example.com/about" }],
      items: [
        {
          id: "https://example.com/blog/post-1",
          title: "Post 1",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = serializeAtomDocument(page, "en", {
      value: "Example Generator",
      version: "1.0.0",
    });

    expect(document).toContain(
      "<author><name>https://example.com/about</name><uri>https://example.com/about</uri></author>",
    );
  });

  it("omits optional RSS item fields when they are absent", () => {
    const page: FeedPage = {
      currentPage: 1,
      totalPages: 1,
      title: "Example Feed",
      description: "Example description.",
      baseUrl: "https://example.com",
      homePageUrl: "https://example.com/blog",
      updated: Temporal.Instant.from("2026-03-14T00:00:00Z"),
      items: [
        {
          id: "https://example.com/blog/post-1",
          title: "Post 1",
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
      routes,
      previousPage: null,
      nextPage: null,
    };

    const document = serializeRssDocument(page, "en");
    const itemMatch = document.match(/<item>([\s\S]*?)<\/item>/);

    expect(itemMatch?.[1]).toContain("<title>Post 1</title>");
    expect(itemMatch?.[1]).toContain(
      '<guid isPermaLink="true">https://example.com/blog/post-1</guid>',
    );
    expect(itemMatch?.[1]).toContain(
      "<pubDate>Fri, 13 Mar 2026 00:00:00 GMT</pubDate>",
    );
    expect(itemMatch?.[1]).not.toContain("<link>");
    expect(itemMatch?.[1]).not.toContain("<description>");
    expect(itemMatch?.[1]).not.toContain("<content:encoded>");
    expect(itemMatch?.[1]).not.toContain("<category>");
  });
});
