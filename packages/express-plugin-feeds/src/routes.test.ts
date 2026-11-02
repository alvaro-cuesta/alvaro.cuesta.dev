import { describe, expect, it } from "vitest";
import { getPaginatedFeedFormatRoutePath } from "./routes.ts";

describe("getPaginatedFeedFormatRoutePath", () => {
  it("builds a page param route", () => {
    expect(getPaginatedFeedFormatRoutePath(["blog"], "atom")).toEqual(
      "/blog/atom-page:page.xml",
    );
  });
});
