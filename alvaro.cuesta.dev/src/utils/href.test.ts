import { describe, expect, it } from "vitest";
import type { AnalyzedItems } from "./analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";
import type { MicroblogItemModuleParsed } from "../microblog/item-module";
import { rewriteCustomProtocolHref } from "./href";

const blogItems: AnalyzedItems<BlogItemModuleParsed> = {
  all: [],
  allSortedByDescendingDate: [],
  allSortedByDescendingDateByPage: new Map(),
  pageBySlug: new Map([["my-post", 1]]),
  bySlug: new Map([
    [
      "my-post",
      {
        filename: "2026-04-02__my-post.mdx",
        module: {
          Component: (() => null) as never,
          title: "My Post",
          summary: null,
          creationDate: { type: "year", year: 2026 },
          publicationDate: { type: "year", year: 2026 },
          lastModificationDate: null,
          draft: false,
          slug: "my-post",
          tags: [{ original: "security", slug: "security" }],
          tableOfContents: [],
        },
      },
    ],
  ]),
  byYear: new Map([[2026, { totalCount: 1, byMonth: new Map() }]]),
  byTag: new Map([["security", []]]),
  yearsSortedDescending: [],
  tagsAscendingAlphabetically: [],
  tagsDescendingByArticleCount: [],
};

const microblogItems: AnalyzedItems<MicroblogItemModuleParsed> = {
  all: [
    {
      filename: "2026-04-10_12-00.mdx",
      module: {
        Component: (() => null) as never,
        slug: "202604101200",
        creationDate: { type: "year", year: 2026 },
        publicationDate: { type: "year", year: 2026 },
        lastModificationDate: null,
        draft: false,
        tags: ["webdev"],
        tableOfContents: [],
      },
    },
  ],
  allSortedByDescendingDate: [],
  allSortedByDescendingDateByPage: new Map(),
  bySlug: new Map([
    [
      "202604101200",
      {
        filename: "2026-04-10_12-00.mdx",
        module: {
          Component: (() => null) as never,
          slug: "202604101200",
          creationDate: { type: "year" as const, year: 2026 },
          publicationDate: { type: "year" as const, year: 2026 },
          lastModificationDate: null,
          draft: false,
          tags: ["webdev"],
          tableOfContents: [],
        },
      },
    ],
  ]),
  pageBySlug: new Map([["202604101200", 1]]),
  byYear: new Map([[2026, { totalCount: 1, byMonth: new Map() }]]),
  byTag: new Map([["webdev", []]]),
  yearsSortedDescending: [],
  tagsAscendingAlphabetically: [],
  tagsDescendingByArticleCount: [],
};

const ctx = { blogItems, microblogItems };

describe("rewriteCustomProtocolHref", () => {
  it("returns undefined for undefined input", () => {
    expect(rewriteCustomProtocolHref(undefined, ctx)).toBeUndefined();
  });

  it("leaves plain URLs unchanged", () => {
    expect(rewriteCustomProtocolHref("https://example.com", ctx)).toBe(
      "https://example.com",
    );
  });

  it("leaves relative paths unchanged", () => {
    expect(rewriteCustomProtocolHref("./foo.mdx", ctx)).toBe("./foo.mdx");
  });

  it("leaves hash-only links unchanged", () => {
    expect(rewriteCustomProtocolHref("#section", ctx)).toBe("#section");
  });

  it("leaves unknown protocols unchanged", () => {
    expect(rewriteCustomProtocolHref("mailto:foo@bar.com", ctx)).toBe(
      "mailto:foo@bar.com",
    );
  });

  describe("blog-post:///", () => {
    it("rewrites to the blog article route", () => {
      expect(rewriteCustomProtocolHref("blog-post:///my-post", ctx)).toBe(
        "/blog/my-post/",
      );
    });

    it("preserves hash and query string", () => {
      expect(
        rewriteCustomProtocolHref("blog-post:///my-post?q=1#toc", ctx),
      ).toBe("/blog/my-post/?q=1#toc");
    });

    it("throws on missing slug", () => {
      expect(() =>
        rewriteCustomProtocolHref("blog-post:///missing", ctx),
      ).toThrow('blog post slug "missing" does not exist');
    });

    it("throws on empty target", () => {
      expect(() => rewriteCustomProtocolHref("blog-post:///", ctx)).toThrow(
        "target is empty",
      );
    });

    it("decodes percent-encoded paths", () => {
      expect(rewriteCustomProtocolHref("blog-post:///%6Dy-post", ctx)).toBe(
        "/blog/my-post/",
      );
    });
  });

  describe("blog-tag:///", () => {
    it("rewrites to the blog tag route", () => {
      expect(rewriteCustomProtocolHref("blog-tag:///security", ctx)).toBe(
        "/blog/tags/security/",
      );
    });

    it("preserves hash and query string", () => {
      expect(
        rewriteCustomProtocolHref("blog-tag:///security?sort=recent#top", ctx),
      ).toBe("/blog/tags/security/?sort=recent#top");
    });

    it("throws on missing tag", () => {
      expect(() =>
        rewriteCustomProtocolHref("blog-tag:///missing", ctx),
      ).toThrow('blog tag "missing" does not exist');
    });
  });

  describe("blog-year:///", () => {
    it("rewrites to the blog year route", () => {
      expect(rewriteCustomProtocolHref("blog-year:///2026", ctx)).toBe(
        "/blog/years/2026/",
      );
    });

    it("preserves hash and query string", () => {
      expect(rewriteCustomProtocolHref("blog-year:///2026#march", ctx)).toBe(
        "/blog/years/2026/#march",
      );
    });

    it("throws on missing year", () => {
      expect(() => rewriteCustomProtocolHref("blog-year:///2020", ctx)).toThrow(
        'blog year "2020" does not exist',
      );
    });

    it("throws on non-numeric year", () => {
      expect(() => rewriteCustomProtocolHref("blog-year:///abc", ctx)).toThrow(
        'blog year "abc" does not exist',
      );
    });
  });

  describe("microblog-post:///", () => {
    it("rewrites to the microblog post page", () => {
      expect(
        rewriteCustomProtocolHref("microblog-post:///202604101200", ctx),
      ).toBe("/timeline/202604101200/");
    });

    it("preserves hash and query string", () => {
      expect(
        rewriteCustomProtocolHref(
          "microblog-post:///202604101200?q=1#section",
          ctx,
        ),
      ).toBe("/timeline/202604101200/?q=1#section");
    });

    it("throws on missing post", () => {
      expect(() =>
        rewriteCustomProtocolHref("microblog-post:///999999999999", ctx),
      ).toThrow('microblog post "999999999999" does not exist');
    });
  });

  describe("microblog-tag:///", () => {
    it("rewrites to the microblog tag route", () => {
      expect(rewriteCustomProtocolHref("microblog-tag:///webdev", ctx)).toBe(
        "/timeline/tags/webdev/",
      );
    });

    it("preserves hash and query string", () => {
      expect(
        rewriteCustomProtocolHref("microblog-tag:///webdev?p=2#top", ctx),
      ).toBe("/timeline/tags/webdev/?p=2#top");
    });

    it("throws on missing tag", () => {
      expect(() =>
        rewriteCustomProtocolHref("microblog-tag:///missing", ctx),
      ).toThrow('microblog tag "missing" does not exist');
    });
  });

  describe("microblog-year:///", () => {
    it("rewrites to the microblog year route", () => {
      expect(rewriteCustomProtocolHref("microblog-year:///2026", ctx)).toBe(
        "/timeline/years/2026/",
      );
    });

    it("preserves hash and query string", () => {
      expect(
        rewriteCustomProtocolHref("microblog-year:///2026#april", ctx),
      ).toBe("/timeline/years/2026/#april");
    });

    it("throws on missing year", () => {
      expect(() =>
        rewriteCustomProtocolHref("microblog-year:///2020", ctx),
      ).toThrow('microblog year "2020" does not exist');
    });
  });

  describe("error formatting", () => {
    it("throws on non-empty host", () => {
      expect(() =>
        rewriteCustomProtocolHref("blog-tag://example.com/foo", ctx),
      ).toThrow("protocol links must use an empty host");
    });
  });
});
