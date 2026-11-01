import { describe, expect, it, vi } from "vitest";
import { cell } from "./cell.ts";
import { family } from "./family.ts";
import { read, thunk } from "./thunk.ts";

describe("family", () => {
  it("doesn't make anything until it's called", () => {
    const make = vi.fn((key: string) => thunk(async () => key));
    family(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives the same thunk for the same key", () => {
    const make = vi.fn((key: string) => thunk(async () => key));
    const getValue = family(make);

    expect(getValue("a")).toBe(getValue("a"));
    expect(make).toHaveBeenCalledOnce();
  });

  it("gives each key its own thunk", async () => {
    const getValue = family((key: string) => thunk(async () => key));

    expect(getValue("a")).not.toBe(getValue("b"));
    expect(await read(getValue("a"))).toBe("a");
    expect(await read(getValue("b"))).toBe("b");
  });

  it("makes a new thunk for a key it dropped", () => {
    const make = vi.fn((key: string) => thunk(async () => key));
    const getValue = family(make);

    const first = getValue("a");
    getValue.retain([]);

    expect(getValue("a")).not.toBe(first);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("keeps the thunks of the keys it retains", () => {
    const getValue = family((key: string) => thunk(async () => key));

    const a = getValue("a");
    const b = getValue("b");
    getValue.retain(["a"]);

    expect(getValue("a")).toBe(a);
    expect(getValue("b")).not.toBe(b);
  });

  it("disposes the thunks it drops", () => {
    const dispose = vi.fn();
    const getValue = family((key: string) =>
      Object.assign(
        cell(async () => key),
        { [Symbol.dispose]: () => dispose(key) },
      ),
    );

    getValue("a");
    getValue("b");
    getValue.retain(["a"]);

    expect(dispose).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledWith("b");
  });

  it("disposes every thunk once disposed, even if one fails to", () => {
    const dispose = vi.fn((key: string) => {
      if (key === "a") throw new Error("nope");
    });
    const getValue = family((key: string) =>
      Object.assign(
        cell(async () => key),
        { [Symbol.dispose]: () => dispose(key) },
      ),
    );

    getValue("a");
    getValue("b");

    expect(() => getValue[Symbol.dispose]()).toThrow("nope");
    expect(dispose).toHaveBeenCalledTimes(2);

    getValue[Symbol.dispose]();

    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it("can't be used once disposed", () => {
    const getValue = family((key: string) => thunk(async () => key));

    getValue[Symbol.dispose]();

    expect(() => getValue("a")).toThrow(ReferenceError);
    expect(() => getValue.retain([])).toThrow(ReferenceError);
  });
});
