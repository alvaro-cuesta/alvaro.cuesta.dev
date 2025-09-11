import { describe, it, expect } from "vitest";
import { parseMeta } from "./remarkParseCodeMeta.mjs";

describe("parseMeta", () => {
  it("parses simple key-value pairs", () => {
    expect(parseMeta("foo=bar baz=qux")).toEqual({ foo: "bar", baz: "qux" });
  });

  it("parses keys without values as true", () => {
    expect(parseMeta("boogie")).toEqual({ boogie: true });
    expect(parseMeta("foo=bar boogie")).toEqual({ foo: "bar", boogie: true });
  });

  it("parses boolean values", () => {
    expect(parseMeta("loler=false")).toEqual({ loler: false });
    expect(parseMeta("loler=true")).toEqual({ loler: true });
  });

  it("parses double-quoted values", () => {
    expect(parseMeta('quoted=" is supported"')).toEqual({
      quoted: " is supported",
    });
  });

  it("parses single-quoted values", () => {
    expect(parseMeta("also-single='quotes work'")).toEqual({
      "also-single": "quotes work",
    });
  });

  it("parses mixed quoted and unquoted values", () => {
    expect(parseMeta("foo=bar quoted=\"hello world\" single='yes'")).toEqual({
      foo: "bar",
      quoted: "hello world",
      single: "yes",
    });
  });

  it("parses multiple flags", () => {
    expect(parseMeta("foo bar baz")).toEqual({
      foo: true,
      bar: true,
      baz: true,
    });
  });

  it("handles empty string", () => {
    expect(parseMeta("")).toEqual({});
  });

  it("handles keys with dashes and underscores", () => {
    expect(parseMeta("foo-bar=1 foo_bar=2")).toEqual({
      "foo-bar": "1",
      foo_bar: "2",
    });
  });

  it("handles values with special characters", () => {
    expect(parseMeta("foo=\"bar=baz\" qux='hello world!'")).toEqual({
      foo: "bar=baz",
      qux: "hello world!",
    });
  });

  it("handles consecutive spaces", () => {
    expect(parseMeta("foo=bar   baz=qux")).toEqual({ foo: "bar", baz: "qux" });
  });

  it("handles keys with numbers", () => {
    expect(parseMeta("foo1=bar2")).toEqual({ foo1: "bar2" });
  });

  it("handles values with numbers and booleans", () => {
    expect(parseMeta("foo=123 bar=true baz=false")).toEqual({
      foo: "123",
      bar: true,
      baz: false,
    });
  });

  it("handles keys with no value after equals", () => {
    expect(parseMeta("foo= bar=baz")).toEqual({ foo: "", bar: "baz" });
  });
});
