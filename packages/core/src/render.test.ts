import { describe, test, expect } from "vitest";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createElement, use } from "react";
import { StripReactComments, renderToString } from "./render.ts";

const strip = async (chunks: string[]): Promise<string> => {
  const input = Readable.from(chunks);
  const transform = new StripReactComments();
  const output: string[] = [];

  transform.on("data", (chunk: string) => output.push(chunk));

  await pipeline(input, transform);

  return output.join("");
};

describe("StripReactComments", () => {
  describe("single chunk", () => {
    test("no comments", async () => {
      expect(await strip(["<div>hello</div>"])).toBe("<div>hello</div>");
    });

    test("empty text node comment: <!-- -->", async () => {
      expect(await strip(["<div><!-- -->hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("suspense open comment: <!--$-->", async () => {
      expect(await strip(["<div><!--$-->hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("suspense close comment: <!--/$-->", async () => {
      expect(await strip(["<div><!--/$-->hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("suspense fallback comment: <!--$?-->", async () => {
      expect(await strip(["<div><!--$?-->hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("section marker: <!--html-->", async () => {
      expect(await strip(["<!--html--><div>hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("section marker: <!--head-->", async () => {
      expect(await strip(["<!--head--><title>x</title>"])).toBe(
        "<title>x</title>",
      );
    });

    test("section marker: <!--body-->", async () => {
      expect(await strip(["<!--body--><div>hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("multiple comments", async () => {
      expect(
        await strip(["<!--$--><div><!-- -->hello<!-- --></div><!--/$-->"]),
      ).toBe("<div>hello</div>");
    });

    test("preserves real HTML comments", async () => {
      expect(await strip(["<!-- real comment -->"])).toBe(
        "<!-- real comment -->",
      );
    });
  });

  describe("chunk boundaries", () => {
    test("comment split across two chunks", async () => {
      expect(await strip(["<div><!-", "- -->hello</div>"])).toBe(
        "<div>hello</div>",
      );
    });

    test("comment split at every byte", async () => {
      const comment = "<!-- -->";
      const before = "<div>";
      const after = "hello</div>";
      const full = before + comment + after;

      for (let i = 1; i < full.length; i++) {
        const chunks = [full.slice(0, i), full.slice(i)];
        expect(await strip(chunks), `split at ${i}: ${JSON.stringify(chunks)}`).toBe(
          "<div>hello</div>",
        );
      }
    });

    test("suspense comment split at every byte", async () => {
      const comment = "<!--/$-->";
      const before = "<div>";
      const after = "hello</div>";
      const full = before + comment + after;

      for (let i = 1; i < full.length; i++) {
        const chunks = [full.slice(0, i), full.slice(i)];
        expect(await strip(chunks), `split at ${i}: ${JSON.stringify(chunks)}`).toBe(
          "<div>hello</div>",
        );
      }
    });

    test("section marker <!--html--> split at every byte", async () => {
      const comment = "<!--html-->";
      const before = "<div>";
      const after = "hello</div>";
      const full = before + comment + after;

      for (let i = 1; i < full.length; i++) {
        const chunks = [full.slice(0, i), full.slice(i)];
        expect(await strip(chunks), `split at ${i}: ${JSON.stringify(chunks)}`).toBe(
          "<div>hello</div>",
        );
      }
    });

    test("multiple comments across many small chunks", async () => {
      const input = "<!--$--><div><!-- -->hello<!-- --></div><!--/$-->";
      // Split into single-character chunks
      const chunks = input.split("");
      expect(await strip(chunks)).toBe("<div>hello</div>");
    });

    test("comment at end of stream", async () => {
      expect(await strip(["<div>hello</div><!-- -->"])).toBe(
        "<div>hello</div>",
      );
    });

    test("comment at end split across chunks", async () => {
      expect(await strip(["<div>hello</div><!--", " -->"])).toBe(
        "<div>hello</div>",
      );
    });

    test("preserves real comment split across chunks", async () => {
      expect(await strip(["<!-- real", " comment -->"])).toBe(
        "<!-- real comment -->",
      );
    });
  });

  describe("edge cases", () => {
    test("empty input", async () => {
      expect(await strip([])).toBe("");
    });

    test("only a comment", async () => {
      expect(await strip(["<!-- -->"])).toBe("");
    });

    test("adjacent comments", async () => {
      expect(await strip(["<!-- --><!-- --><!-- -->"])).toBe("");
    });

    test("< in normal content near chunk boundary", async () => {
      expect(await strip(["<b>x</b>", "<i>y</i>"])).toBe("<b>x</b><i>y</i>");
    });
  });
});

describe("renderToString", () => {
  const forever = new Promise<never>(() => {});
  const Pending = () => use(forever);

  test("fails once its signal aborts", async () => {
    const controller = new AbortController();
    const rendering = renderToString(createElement(Pending), {
      signal: controller.signal,
    });

    controller.abort(new Error("Not wanted anymore"));

    await expect(rendering).rejects.toThrow();
  });

  test("fails right away with a signal that already aborted", async () => {
    await expect(
      renderToString(createElement("div"), {
        signal: AbortSignal.abort(new Error("Not wanted anymore")),
      }),
    ).rejects.toThrow();
  });

  test("still times out with a signal", async () => {
    await expect(
      renderToString(createElement(Pending), {
        timeoutMsecs: 10,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow();
  });
});
