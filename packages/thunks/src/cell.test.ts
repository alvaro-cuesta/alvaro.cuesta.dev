import { describe, expect, it, vi } from "vitest";
import { cell } from "./cell.ts";

describe("cell", () => {
  it("doesn't run until it's called", () => {
    const make = vi.fn(() => Promise.resolve(1));
    cell(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every call the same promise until it's invalidated", async () => {
    let value = 1;
    const make = vi.fn(() => Promise.resolve(value));
    const getValue = cell(make);

    const first = getValue();

    expect(getValue()).toBe(first);
    expect(await first).toBe(1);

    value = 2;
    getValue.invalidate();
    const second = getValue();

    expect(second).not.toBe(first);
    expect(getValue()).toBe(second);
    expect(await second).toBe(2);
    expect(await first).toBe(1);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("doesn't run again when invalidated, only when called after", () => {
    const make = vi.fn(() => Promise.resolve(1));
    const getValue = cell(make);

    getValue();
    getValue.invalidate();
    getValue.invalidate();

    expect(make).toHaveBeenCalledOnce();

    getValue();

    expect(make).toHaveBeenCalledTimes(2);
  });

  it("keeps a rejected promise until it's invalidated", async () => {
    let fails = true;
    const make = vi.fn(() =>
      fails ? Promise.reject(new Error("nope")) : Promise.resolve(1),
    );
    const getValue = cell(make);

    const first = getValue();

    await expect(first).rejects.toThrow("nope");
    expect(getValue()).toBe(first);

    fails = false;
    getValue.invalidate();

    expect(await getValue()).toBe(1);
  });
});
