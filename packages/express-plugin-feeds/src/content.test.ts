import { describe, expect, it, vi } from "vitest";
import { compileFeedPageModels } from "./content.ts";

describe("compileFeedPageModels", () => {
  it("skips rendering when full content is disabled", async () => {
    const render = vi.fn().mockResolvedValue("<p>Hello world</p>");

    const pages = await compileFeedPageModels({
      baseUrl: "https://example.com",
      mountPointFragments: ["blog"],
      itemsPerPage: 10,
      title: "Example Feed",
      description: "Example description.",
      homePagePathname: "/blog/",
      authors: [],
      content: {
        html: "none",
        text: "none",
      },
      getItems: async () => [
        {
          pathname: "/blog/post-1",
          title: "Post 1",
          summary: "Short summary",
          render,
          datePublished: Temporal.Instant.from("2026-03-13T00:00:00Z"),
        },
      ],
    });

    expect(render).not.toHaveBeenCalled();
    expect(pages[0]?.items[0]).toMatchObject({
      title: "Post 1",
      summary: "Short summary",
    });
    expect(pages[0]?.items[0]).not.toHaveProperty("contentHtml");
    expect(pages[0]?.items[0]).not.toHaveProperty("contentText");
  });

  it("updates a page with the publications up to it and its own edits", async () => {
    const item = (
      slug: string,
      datePublished: string,
      dateModified?: string,
    ) => ({
      pathname: `/blog/${slug}`,
      title: slug,
      render: () => "",
      datePublished: Temporal.Instant.from(datePublished),
      ...(dateModified
        ? { dateModified: Temporal.Instant.from(dateModified) }
        : {}),
    });

    const pages = await compileFeedPageModels({
      baseUrl: "https://example.com",
      mountPointFragments: ["blog"],
      itemsPerPage: 2,
      title: "Example Feed",
      description: "Example description.",
      homePagePathname: "/blog/",
      authors: [],
      content: {
        html: "none",
        text: "none",
      },
      getItems: async () => [
        item("post-5", "2026-05-01T00:00:00Z"),
        item("post-4", "2026-04-01T00:00:00Z", "2026-06-01T00:00:00Z"),
        item("post-3", "2026-03-01T00:00:00Z"),
        item("post-2", "2026-02-01T00:00:00Z"),
        item("post-1", "2026-01-01T00:00:00Z", "2026-07-01T00:00:00Z"),
      ],
    });

    expect(pages.map((page) => page.updated?.toString())).toEqual([
      // Its own edit.
      "2026-06-01T00:00:00Z",
      // The first page's newest publication pushed an item onto it, and the
      // first page's edit doesn't change it.
      "2026-05-01T00:00:00Z",
      // Its own edit, which is newer than any publication.
      "2026-07-01T00:00:00Z",
    ]);
  });
});
