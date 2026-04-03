import { describe, expect, it } from "vitest";
import type { BlogItem } from "./item";
import { rewriteBlogMdxHref } from "./href";

const createBlogItem = (
  filename: string,
  slug: string,
  tags: string[] = [],
): BlogItem => ({
  filename,
  module: {
    Component: (() => null) as never,
    title: slug,
    summary: null,
    creationDate: { type: "year", year: 2026 },
    publicationDate: { type: "year", year: 2026 },
    lastModificationDate: null,
    draft: false,
    slug,
    tags: tags.map((tag) => ({ original: tag, slug: tag })),
    tableOfContents: [],
  },
});

describe("rewriteBlogMdxHref", () => {
  const blogItems = [
    createBlogItem(
      "2026-04-02__my-ssh-key-setup.mdx",
      "oh-my-ssh-keys-part-1-one-key-too-many",
      ["security", "oh-my-ssh-keys"],
    ),
    createBlogItem(
      "2026-04-09__my-ssh-key-setup-part-2.mdx",
      "oh-my-ssh-keys-part-2-a-new-approach",
      ["security"],
    ),
  ];

  it("leaves .mdx links unchanged", () => {
    expect(
      rewriteBlogMdxHref(
        "./2026-04-09__my-ssh-key-setup-part-2.mdx?view=full#summary",
        {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        },
      ),
    ).toBe("./2026-04-09__my-ssh-key-setup-part-2.mdx?view=full#summary");
  });

  it("leaves external .mdx links unchanged", () => {
    expect(
      rewriteBlogMdxHref("https://example.com/blog/post.mdx", {
        currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
        blogItems,
      }),
    ).toBe("https://example.com/blog/post.mdx");
  });

  it("leaves non-mdx links unchanged", () => {
    expect(
      rewriteBlogMdxHref("./assets/key-diagram.png", {
        currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
        blogItems,
      }),
    ).toBe("./assets/key-diagram.png");
  });

  describe("tag:///", () => {
    it("rewrites tag protocol links using URL parsing and the blog tag route", () => {
      expect(
        rewriteBlogMdxHref("tag:///oh-my-ssh-keys", {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        }),
      ).toBe("/blog/tags/oh-my-ssh-keys/");
    });

    it("preserves hashes and query strings on protocol links", () => {
      expect(
        rewriteBlogMdxHref("tag:///security?sort=recent#articles", {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        }),
      ).toBe("/blog/tags/security/?sort=recent#articles");
    });

    it("throws on unknown protocol targets", () => {
      expect(() =>
        rewriteBlogMdxHref("tag:///missing-tag", {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        }),
      ).toThrow('contains a broken internal blog link "tag:///missing-tag"');
    });

    it("decodes percent-encoded protocol paths", () => {
      expect(
        rewriteBlogMdxHref("tag:///%6Fh-my-ssh-keys", {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        }),
      ).toBe("/blog/tags/oh-my-ssh-keys/");
    });
  });

  describe("post-slug:///", () => {
    it("rewrites post-slug protocol links using the blog article route", () => {
      expect(
        rewriteBlogMdxHref(
          "post-slug:///oh-my-ssh-keys-part-2-a-new-approach",
          {
            currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
            blogItems,
          },
        ),
      ).toBe("/blog/oh-my-ssh-keys-part-2-a-new-approach/");
    });

    it("preserves hashes and query strings on protocol links", () => {
      expect(
        rewriteBlogMdxHref(
          "post-slug:///oh-my-ssh-keys-part-1-one-key-too-many#toc",
          {
            currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
            blogItems,
          },
        ),
      ).toBe("/blog/oh-my-ssh-keys-part-1-one-key-too-many/#toc");
    });

    it("throws on unknown protocol targets", () => {
      expect(() =>
        rewriteBlogMdxHref("post-slug:///missing-post", {
          currentFilename: "2026-04-02__my-ssh-key-setup.mdx",
          blogItems,
        }),
      ).toThrow(
        'contains a broken internal blog link "post-slug:///missing-post"',
      );
    });
  });
});
