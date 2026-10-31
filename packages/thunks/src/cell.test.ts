import { describe, expect, it, vi } from "vitest";
import { cell } from "./cell.ts";
import { read } from "./thunk.ts";

describe("cell", () => {
  it("doesn't run until it's read", () => {
    const make = vi.fn(() => Promise.resolve(1));
    cell(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every read the same promise until it's invalidated", async () => {
    let value = 1;
    const make = vi.fn(() => Promise.resolve(value));
    const getValue = cell(make);

    const first = read(getValue);

    expect(read(getValue)).toBe(first);
    expect(await first).toBe(1);

    value = 2;
    getValue.invalidate();
    const second = read(getValue);

    expect(second).not.toBe(first);
    expect(read(getValue)).toBe(second);
    expect(await second).toBe(2);
    expect(await first).toBe(1);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("doesn't run again when invalidated, only when read after", () => {
    const make = vi.fn(() => Promise.resolve(1));
    const getValue = cell(make);

    read(getValue);
    getValue.invalidate();
    getValue.invalidate();

    expect(make).toHaveBeenCalledOnce();

    read(getValue);

    expect(make).toHaveBeenCalledTimes(2);
  });

  it("keeps a rejected promise until it's invalidated", async () => {
    let fails = true;
    const make = vi.fn(() =>
      fails ? Promise.reject(new Error("nope")) : Promise.resolve(1),
    );
    const getValue = cell(make);

    const first = read(getValue);

    await expect(first).rejects.toThrow("nope");
    expect(read(getValue)).toBe(first);

    fails = false;
    getValue.invalidate();

    expect(await read(getValue)).toBe(1);
  });
});
