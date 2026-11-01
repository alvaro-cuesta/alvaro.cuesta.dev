import { describe, expect, test } from "vitest";
import { resolveSiteHref, toServedHref } from "./url.ts";

describe("toServedHref", () => {
  test.each([
    ["/blog/", "/repo/blog/"],
    ["/", "/repo/"],
    ["about/", "about/"],
    ["../about/", "../about/"],
    ["#top", "#top"],
    ["?page=2", "?page=2"],
    ["https://example.com/blog/", "https://example.com/blog/"],
    ["//example.com/blog/", "//example.com/blog/"],
    ["mailto:me@example.com", "mailto:me@example.com"],
  ])("serves %s at %s under /repo", (href, servedHref) => {
    expect(toServedHref(href, "/repo")).toBe(servedHref);
  });

  test("leaves site paths as they are at the root", () => {
    expect(toServedHref("/blog/", "")).toBe("/blog/");
  });
});

describe("resolveSiteHref", () => {
  test.each([
    ["/blog/", "https://example.com/repo/blog/"],
    ["other/", "https://example.com/repo/blog/post/other/"],
    ["../", "https://example.com/repo/blog/"],
    ["#top", "https://example.com/repo/blog/post/#top"],
    ["https://elsewhere.com/", "https://elsewhere.com/"],
  ])("resolves %s in /blog/post/ to %s", (href, url) => {
    expect(
      resolveSiteHref(href, "/blog/post/", "https://example.com/repo").href,
    ).toBe(url);
  });

  test("resolves site paths at the root of the origin", () => {
    expect(
      resolveSiteHref("/blog/", "/blog/post/", "https://example.com").href,
    ).toBe("https://example.com/blog/");
  });
});
