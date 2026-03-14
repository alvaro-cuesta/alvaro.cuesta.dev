import { describe, expect, it } from "vitest";
import {
  getFeedSitemapPathnames,
  getPaginatedFeedFormatRoutePath,
} from "./routes";

describe("getFeedSitemapPathnames", () => {
  it("includes discoverable formats for every feed archive page", () => {
    expect(getFeedSitemapPathnames(3)).toEqual([
      "/feed.rss",
      "/feed.json",
      "/atom.xml",
      "/feed-page2.rss",
      "/feed-page2.json",
      "/atom-page2.xml",
      "/feed-page3.rss",
      "/feed-page3.json",
      "/atom-page3.xml",
    ]);
  });

  it("supports parent mount point fragments without changing filenames", () => {
    expect(getFeedSitemapPathnames(2, ["blog"])).toEqual([
      "/blog/feed.rss",
      "/blog/feed.json",
      "/blog/atom.xml",
      "/blog/feed-page2.rss",
      "/blog/feed-page2.json",
      "/blog/atom-page2.xml",
    ]);
  });

  it("returns no sitemap entries when there are no feed pages", () => {
    expect(getFeedSitemapPathnames(0)).toEqual([]);
  });
});

describe("getPaginatedFeedFormatRoutePath", () => {
  it("builds an explicit numeric page param route", () => {
    expect(getPaginatedFeedFormatRoutePath(["blog"], "atom")).toEqual(
      "/blog/atom-page:page(\\d+).xml",
    );
  });
});
