import { describe, expect, it, vi } from "vitest";
import { Temporal } from "temporal-polyfill";
import { compileFeedPageModels } from "./content";

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
});
