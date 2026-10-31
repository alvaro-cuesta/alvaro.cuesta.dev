import { describe, expect, it, vi } from "vitest";
import { cell } from "./cell.ts";
import { derived, type Get } from "./derived.ts";

describe("derived", () => {
  it("doesn't run until it's called", () => {
    const make = vi.fn(() => Promise.resolve(1));
    derived(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every call the same promise while what it read gives the same promises", async () => {
    const source = cell(() => Promise.resolve(1));
    const make = vi.fn(async (get: Get) => (await get(source)) * 2);
    const getValue = derived(make);

    const first = getValue();

    expect(getValue()).toBe(first);
    expect(await first).toBe(2);
    expect(getValue()).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("runs again once a thunk it read gives a new promise", async () => {
    let value = 1;
    const source = cell(() => Promise.resolve(value));
    const getValue = derived(async (get) => (await get(source)) * 2);

    const first = getValue();
    expect(await first).toBe(2);

    value = 2;
    source.invalidate();

    const second = getValue();

    expect(second).not.toBe(first);
    expect(getValue()).toBe(second);
    expect(await second).toBe(4);
    expect(await first).toBe(2);
  });

  it("runs again when what it read changed somewhere down the chain", async () => {
    let value = 1;
    const source = cell(() => Promise.resolve(value));
    const doubled = derived(async (get) => (await get(source)) * 2);
    const getValue = derived(async (get) => (await get(doubled)) + 1);

    expect(await getValue()).toBe(3);

    value = 2;
    source.invalidate();

    expect(await getValue()).toBe(5);
  });

  it("tracks reads made after an await", async () => {
    let value = 1;
    const first = cell(() => Promise.resolve(1));
    const second = cell(() => Promise.resolve(value));
    const getValue = derived(
      async (get) => (await get(first)) + (await get(second)),
    );

    expect(await getValue()).toBe(2);

    value = 2;
    second.invalidate();

    expect(await getValue()).toBe(3);
  });

  it("only tracks what the last run read", async () => {
    let useA = true;
    const choice = cell(() => Promise.resolve(useA));
    const a = cell(() => Promise.resolve("a"));
    const b = cell(() => Promise.resolve("b"));
    const make = vi.fn(async (get: Get) =>
      (await get(choice)) ? get(a) : get(b),
    );
    const getValue = derived(make);

    expect(await getValue()).toBe("a");

    b.invalidate();
    getValue();

    expect(make).toHaveBeenCalledOnce();

    useA = false;
    choice.invalidate();

    expect(await getValue()).toBe("b");

    a.invalidate();
    getValue();

    expect(make).toHaveBeenCalledTimes(2);
  });

  it("runs again when a thunk it read twice gave a new promise in between", async () => {
    let value = 1;
    const source = cell(() => Promise.resolve(value));
    const make = vi.fn(async (get: Get) => {
      const before = await get(source);
      value = 2;
      source.invalidate();
      return before + (await get(source));
    });
    const getValue = derived(make);

    expect(await getValue()).toBe(3);

    // The value used both promises, so it's out of date with either.
    expect(await getValue()).toBe(4);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("doesn't track reads made after its promise settled", async () => {
    const source = cell(() => Promise.resolve(1));
    let lateGet: Get | undefined;
    const make = vi.fn(async (get: Get) => {
      lateGet = get;
      return 0;
    });
    const getValue = derived(make);

    await getValue();
    await lateGet?.(source);
    source.invalidate();
    getValue();

    expect(make).toHaveBeenCalledOnce();
  });

  it("keeps a rejection until what it read gives a new promise", async () => {
    let fails = true;
    const source = cell(() =>
      fails ? Promise.reject(new Error("nope")) : Promise.resolve(1),
    );
    const getValue = derived(async (get) => (await get(source)) * 2);

    const first = getValue();

    await expect(first).rejects.toThrow("nope");
    expect(getValue()).toBe(first);

    fails = false;
    source.invalidate();

    expect(await getValue()).toBe(2);
  });
});
