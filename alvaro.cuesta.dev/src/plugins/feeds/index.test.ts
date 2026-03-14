import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedsPlugin } from "./index";

describe("getFeedSitemapPathnames", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("infers configured sitemap pathnames from the configured item resolver", async () => {
    const getItems = vi.fn().mockResolvedValue(new Array(21).fill(null));
    const feeds = feedsPlugin({
      getItems,
      homePagePathname: "/blog/",
      title: "Blog",
      description: "Description",
      mountPointFragments: ["blog"],
      itemsPerPage: 10,
    });

    await expect(feeds.getFeedSitemapPathnames()).resolves.toEqual([
      "/blog/feed.rss",
      "/blog/feed.json",
      "/blog/atom.xml",
      "/blog/feed-page2.rss",
      "/blog/feed-page2.json",
      "/blog/atom-page2.xml",
      "/blog/feed-page3.rss",
      "/blog/feed-page3.json",
      "/blog/atom-page3.xml",
    ]);

    expect(getItems).toHaveBeenCalledTimes(1);
    expect(getItems).toHaveBeenCalledWith({
      baseUrl: "https://feeds.invalid",
    });
  });

  it("respects the configured itemsPerPage", async () => {
    const getItems = vi.fn().mockResolvedValue(new Array(1).fill(null));
    const feeds = feedsPlugin({
      getItems,
      homePagePathname: "/blog/",
      title: "Blog",
      description: "Description",
      mountPointFragments: ["blog"],
      itemsPerPage: 10,
    });

    await expect(feeds.getFeedSitemapPathnames()).resolves.toEqual([
      "/blog/feed.rss",
      "/blog/feed.json",
      "/blog/atom.xml",
    ]);
  });
});
