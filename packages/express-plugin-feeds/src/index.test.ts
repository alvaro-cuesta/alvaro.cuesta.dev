import { describe, expect, it } from "vitest";
import { feedsPlugin, type FeedSourceItem } from "./index.ts";

function makeItems(count: number): FeedSourceItem[] {
  return Array.from({ length: count }, (_value, index) => ({
    pathname: `/blog/post-${index + 1}/`,
    title: `Post ${index + 1}`,
    render: () => `<p>Post ${index + 1}</p>`,
    datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
  }));
}

describe("fileMetadata", () => {
  it("gives each feed document the build writes its metadata", async () => {
    const feeds = feedsPlugin({
      getItems: async () => makeItems(11),
      homePagePathname: "/blog/",
      title: "Blog",
      description: "Description",
      mountPointFragments: ["blog"],
      itemsPerPage: 10,
      formats: ["atom", "rss"],
      fileMetadata: ({ format, page }) =>
        format === "atom" ? { page: page.currentPage } : undefined,
    });

    const emitted: [string, unknown][] = [];
    await feeds(
      {
        origin: "https://example.com",
        basepath: "",
        baseUrl: "https://example.com",
      },
      // No host cache: nothing here is slow to make.
      { cache: undefined },
    )?.buildPre?.({
      siteMeta: {
        origin: "https://example.com",
        basepath: "",
        baseUrl: "https://example.com",
      },
      baseOutputFolder: "/unused",
      emitStaticPathname: (pathname, metadata) => {
        emitted.push([pathname, metadata]);
      },
    });

    expect(emitted).toEqual([
      ["/blog/atom.xml", { page: 1 }],
      ["/blog/feed.rss", undefined],
      ["/blog/atom-page2.xml", { page: 2 }],
      ["/blog/feed-page2.rss", undefined],
    ]);
  });
});
