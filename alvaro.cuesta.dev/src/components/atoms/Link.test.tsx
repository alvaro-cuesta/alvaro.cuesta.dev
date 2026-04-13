import { describe, expect, it } from "vitest";
import { extractText, isLinkTextRedundant } from "./Link";

describe("extractText", () => {
  it("returns empty string for null, undefined, and booleans", () => {
    expect(extractText(null)).toBe("");
    expect(extractText(undefined)).toBe("");
    expect(extractText(true)).toBe("");
    expect(extractText(false)).toBe("");
  });

  it("returns string and number values as-is", () => {
    expect(extractText("hello")).toBe("hello");
    expect(extractText(42)).toBe("42");
  });

  it("joins array children without separators", () => {
    expect(extractText(["foo", " ", "bar"])).toBe("foo bar");
    expect(extractText(["a", 1, "b"])).toBe("a1b");
  });

  it("extracts text from a single React element", () => {
    expect(extractText(<span>hello</span>)).toBe("hello");
  });

  it("recursively extracts text from nested elements", () => {
    expect(
      extractText(
        <span>
          <strong>youtube</strong>
          <em>.com</em>
        </span>,
      ),
    ).toBe("youtube.com");
  });

  it("extracts text from fragments", () => {
    expect(
      extractText(
        <>
          <span>foo</span>
          <span>bar</span>
        </>,
      ),
    ).toBe("foobar");
  });

  it("ignores elements with no children", () => {
    expect(extractText(<br />)).toBe("");
  });
});

describe("isLinkTextRedundant", () => {
  it("returns false when href is missing", () => {
    expect(isLinkTextRedundant("youtube.com", undefined)).toBe(false);
  });

  it("returns false when extracted text is empty", () => {
    expect(isLinkTextRedundant(null, "https://youtube.com")).toBe(false);
    expect(isLinkTextRedundant("   ", "https://youtube.com")).toBe(false);
  });

  it("matches an exact href", () => {
    expect(
      isLinkTextRedundant("https://youtube.com", "https://youtube.com"),
    ).toBe(true);
  });

  it("matches an href with a trailing slash", () => {
    expect(
      isLinkTextRedundant("https://youtube.com", "https://youtube.com/"),
    ).toBe(true);
  });

  it("matches the registrable domain", () => {
    expect(isLinkTextRedundant("youtube.com", "https://youtube.com")).toBe(
      true,
    );
  });

  it("matches the domain without TLD", () => {
    expect(isLinkTextRedundant("youtube", "https://youtube.com")).toBe(true);
  });

  it("matches the full hostname with subdomain", () => {
    expect(
      isLinkTextRedundant("music.youtube.com", "https://music.youtube.com"),
    ).toBe(true);
  });

  it("ignores leading www. in the link text", () => {
    expect(isLinkTextRedundant("www.youtube.com", "https://youtube.com")).toBe(
      true,
    );
  });

  it("is case-insensitive", () => {
    expect(isLinkTextRedundant("YouTube.com", "https://youtube.com")).toBe(
      true,
    );
    expect(isLinkTextRedundant("YOUTUBE", "https://youtube.com")).toBe(true);
  });

  it("trims whitespace around the text", () => {
    expect(isLinkTextRedundant("  youtube.com  ", "https://youtube.com")).toBe(
      true,
    );
  });

  it("does not match a different registrable domain", () => {
    expect(isLinkTextRedundant("youtube.net", "https://youtube.com")).toBe(
      false,
    );
  });

  it("does not match arbitrary text", () => {
    expect(isLinkTextRedundant("watch this video", "https://youtube.com")).toBe(
      false,
    );
  });

  it("does not match when only a substring of the domain", () => {
    expect(isLinkTextRedundant("tube", "https://youtube.com")).toBe(false);
  });

  it("works with non-string children by extracting their text", () => {
    expect(
      isLinkTextRedundant(<strong>youtube.com</strong>, "https://youtube.com"),
    ).toBe(true);
    expect(
      isLinkTextRedundant(
        <>
          <span>you</span>
          <span>tube</span>
        </>,
        "https://youtube.com",
      ),
    ).toBe(true);
  });

  it("returns false when the href has no parseable domain", () => {
    expect(isLinkTextRedundant("mailto", "mailto:foo@bar.com")).toBe(false);
  });
});
