import React from "react";
import { describe, expect, it } from "vitest";
import type { MDXContent } from "mdx/types";
import { parseBlogItemModuleFromImportModule } from "./item-module";

const createMdxComponent = (): MDXContent => {
  const Component = (() =>
    React.createElement(React.Fragment)) as unknown as MDXContent;

  (Component as MDXContent & { isMDXComponent: boolean }).isMDXComponent = true;

  return Component;
};

describe("parseBlogItemModuleFromImportModule", () => {
  it("parses the optional summary export", () => {
    const parsed = parseBlogItemModuleFromImportModule(
      "2026-03-14__example-post.mdx",
      {
        default: createMdxComponent(),
        summary: "Manual summary",
        tableOfContents: [],
      } as unknown as NodeModule,
    );

    expect(parsed.summary).toBe("Manual summary");
  });

  it("rejects non-string summary exports", () => {
    expect(() =>
      parseBlogItemModuleFromImportModule("2026-03-14__example-post.mdx", {
        default: createMdxComponent(),
        summary: 123,
        tableOfContents: [],
      } as unknown as NodeModule),
    ).toThrow("`summary` in blog post is not a `string`");
  });
});
