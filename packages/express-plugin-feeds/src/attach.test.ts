import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { feedsPlugin, type FeedSourceItem } from "./index.ts";

const FALLBACK_BODY = "fallback";

function makeItems(count: number): FeedSourceItem[] {
  return Array.from({ length: count }, (_value, index) => ({
    pathname: `/blog/post-${index + 1}/`,
    title: `Post ${index + 1}`,
    render: () => `<p>Post ${index + 1}</p>`,
    datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
  }));
}

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server === undefined) {
      resolve();
      return;
    }

    server.close(() => {
      resolve();
    });
  });
  server = undefined;
});

/**
 * Serve the feeds of `itemCount` items, 10 per page, followed by a handler
 * that stands in for whatever the site serves when nothing else matches.
 */
async function serveFeeds(itemCount: number): Promise<string> {
  const feeds = feedsPlugin({
    getItems: async () => makeItems(itemCount),
    homePagePathname: "/blog/",
    title: "Blog",
    description: "Description",
    mountPointFragments: ["blog"],
    itemsPerPage: 10,
    formats: ["rss"],
  });

  const app = express();
  feeds({
    origin: "https://example.com",
    basepath: "",
    baseUrl: "https://example.com",
  })?.attachToExpress?.(app);
  app.use((_req, res) => {
    res.status(404).end(FALLBACK_BODY);
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const { port } = server!.address() as AddressInfo;

  return `http://127.0.0.1:${port}`;
}

describe("attachToExpress", () => {
  it("serves the pages the build writes", async () => {
    const origin = await serveFeeds(21);

    for (const pathname of [
      "/blog/feed.rss",
      "/blog/feed-page2.rss",
      "/blog/feed-page3.rss",
    ]) {
      const response = await fetch(`${origin}${pathname}`);

      expect(response.status, pathname).toBe(200);
      expect(response.headers.get("content-type"), pathname).toBe(
        "application/rss+xml; charset=utf-8",
      );
    }
  });

  it("falls through for page numbers the build doesn't write that way", async () => {
    const origin = await serveFeeds(21);

    for (const pathname of [
      "/blog/feed-page1.rss",
      "/blog/feed-page02.rss",
      "/blog/feed-page2x.rss",
      "/blog/feed-page-2.rss",
    ]) {
      const response = await fetch(`${origin}${pathname}`);

      expect(response.status, pathname).toBe(404);
      expect(await response.text(), pathname).toBe(FALLBACK_BODY);
    }
  });

  it("falls through past the last page", async () => {
    const origin = await serveFeeds(21);
    const response = await fetch(`${origin}/blog/feed-page4.rss`);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe(FALLBACK_BODY);
  });

  it("falls through for the first page when there are no items", async () => {
    const origin = await serveFeeds(0);
    const response = await fetch(`${origin}/blog/feed.rss`);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe(FALLBACK_BODY);
  });
});
