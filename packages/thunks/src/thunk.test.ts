import { describe, expect, it, vi } from "vitest";
import { read, thunk, type Thunk } from "./thunk.ts";

describe("Thunk", () => {
  it("isn't any function that returns a promise", () => {
    // @ts-expect-error Only this package makes thunks.
    const notAThunk: Thunk<number> = async () => 1;

    expect(notAThunk).toBeTypeOf("function");
  });

  it("can't be called, only read", async () => {
    const value = thunk(async () => 1);

    // @ts-expect-error Reads go through `get` or `read`, so each says whether it's tracked.
    expect(() => value()).toThrow(TypeError);
    expect(await read(value)).toBe(1);
  });
});

describe("thunk", () => {
  it("doesn't run until it's read", () => {
    const make = vi.fn(() => Promise.resolve(1));
    thunk(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every read the same promise", async () => {
    const make = vi.fn(() => Promise.resolve(1));
    const getValue = thunk(make);

    const first = read(getValue);

    expect(read(getValue)).toBe(first);
    expect(await first).toBe(1);
    expect(read(getValue)).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("keeps a rejected promise", async () => {
    const make = vi.fn(() => Promise.reject(new Error("nope")));
    const getValue = thunk(make);

    const first = read(getValue);

    await expect(first).rejects.toThrow("nope");
    expect(read(getValue)).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("rejects every read once disposed, with the same promise, without running", async () => {
    const make = vi.fn(() => Promise.resolve(1));
    const getValue = thunk(make);

    getValue[Symbol.dispose]();
    const first = read(getValue);

    await expect(first).rejects.toThrow(ReferenceError);
    expect(read(getValue)).toBe(first);
    expect(make).not.toHaveBeenCalled();
  });

  it("keeps the promises it gave before it was disposed", async () => {
    const getValue = thunk(async () => 1);

    const before = read(getValue);
    getValue[Symbol.dispose]();

    expect(await before).toBe(1);
  });
});
