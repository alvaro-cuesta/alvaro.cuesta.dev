import React from "react";
import { describe, expect, it } from "vitest";
import type { MDXContent } from "mdx/types";
import { Temporal } from "temporal-polyfill";
import { dateToBlogItemDate } from "../utils/item-dates";
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
      {
        lastModificationDate: null,
      },
    );

    expect(parsed.summary).toBe("Manual summary");
  });

  it("rejects non-string summary exports", () => {
    expect(() =>
      parseBlogItemModuleFromImportModule(
        "2026-03-14__example-post.mdx",
        {
          default: createMdxComponent(),
          summary: 123,
          tableOfContents: [],
        } as unknown as NodeModule,
        {
          lastModificationDate: null,
        },
      ),
    ).toThrow("`summary` in blog post is not a `string`");
  });

  it("uses an inferred last modification date when no manual one exists", () => {
    const parsed = parseBlogItemModuleFromImportModule(
      "2026-03-14__example-post.mdx",
      {
        default: createMdxComponent(),
        tableOfContents: [],
      } as unknown as NodeModule,
      {
        lastModificationDate: new Date("2026-03-15T09:30:00Z"),
      },
    );

    expect(parsed.lastModificationDate).toEqual(
      dateToBlogItemDate(new Date("2026-03-15T09:30:00Z")),
    );
  });

  it("prefers the manual last modification date over the inferred one", () => {
    const parsed = parseBlogItemModuleFromImportModule(
      "2026-03-14__example-post.mdx",
      {
        default: createMdxComponent(),
        lastModificationDate: Temporal.PlainDate.from("2026-03-20"),
        tableOfContents: [],
      } as unknown as NodeModule,
      {
        lastModificationDate: new Date("2026-03-15T09:30:00Z"),
      },
    );

    expect(parsed.lastModificationDate).toEqual({
      type: "date",
      date: Temporal.PlainDate.from("2026-03-20"),
    });
  });

  it("ignores an inferred last modification date before publication", () => {
    const parsed = parseBlogItemModuleFromImportModule(
      "2026-03-14__example-post.mdx",
      {
        default: createMdxComponent(),
        publicationDate: Temporal.PlainDateTime.from("2026-03-16T12:00:00"),
        tableOfContents: [],
      } as unknown as NodeModule,
      {
        lastModificationDate: new Date("2026-03-15T09:30:00Z"),
      },
    );

    expect(parsed.lastModificationDate).toBeNull();
  });
});
