import { describe, expect, it, vi } from "vitest";
import { cell } from "./cell.ts";
import { derived, type Get } from "./derived.ts";
import { read } from "./thunk.ts";

describe("derived", () => {
  it("doesn't run until it's read", () => {
    const make = vi.fn(() => Promise.resolve(1));
    derived(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every read the same promise while what it read gives the same promises", async () => {
    const source = cell(() => Promise.resolve(1));
    const make = vi.fn(async (get: Get) => (await get(source)) * 2);
    const result = derived(make);

    const first = read(result);

    expect(read(result)).toBe(first);
    expect(await first).toBe(2);
    expect(read(result)).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("runs again once a thunk it read gives a new promise", async () => {
    let value = 1;
    const source = cell(() => Promise.resolve(value));
    const result = derived(async (get) => (await get(source)) * 2);

    const first = read(result);
    expect(await first).toBe(2);

    value = 2;
    source.invalidate();

    const second = read(result);

    expect(second).not.toBe(first);
    expect(read(result)).toBe(second);
    expect(await second).toBe(4);
    expect(await first).toBe(2);
  });

  it("runs again when what it read changed somewhere down the chain", async () => {
    let value = 1;
    const source = cell(() => Promise.resolve(value));
    const doubled = derived(async (get) => (await get(source)) * 2);
    const result = derived(async (get) => (await get(doubled)) + 1);

    expect(await read(result)).toBe(3);

    value = 2;
    source.invalidate();

    expect(await read(result)).toBe(5);
  });

  it("tracks reads made after an await", async () => {
    let value = 1;
    const first = cell(() => Promise.resolve(1));
    const second = cell(() => Promise.resolve(value));
    const result = derived(
      async (get) => (await get(first)) + (await get(second)),
    );

    expect(await read(result)).toBe(2);

    value = 2;
    second.invalidate();

    expect(await read(result)).toBe(3);
  });

  it("only tracks what the last run read", async () => {
    let useA = true;
    const choice = cell(() => Promise.resolve(useA));
    const a = cell(() => Promise.resolve("a"));
    const b = cell(() => Promise.resolve("b"));
    const make = vi.fn(async (get: Get) =>
      (await get(choice)) ? get(a) : get(b),
    );
    const result = derived(make);

    expect(await read(result)).toBe("a");

    b.invalidate();
    read(result);

    expect(make).toHaveBeenCalledOnce();

    useA = false;
    choice.invalidate();

    expect(await read(result)).toBe("b");

    a.invalidate();
    read(result);

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
    const result = derived(make);

    expect(await read(result)).toBe(3);

    // The value used both promises, so it's out of date with either.
    expect(await read(result)).toBe(4);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("doesn't track reads made after its promise settled", async () => {
    const source = cell(() => Promise.resolve(1));
    let lateGet: Get | undefined;
    const make = vi.fn(async (get: Get) => {
      lateGet = get;
      return 0;
    });
    const result = derived(make);

    await read(result);
    await lateGet?.(source);
    source.invalidate();
    read(result);

    expect(make).toHaveBeenCalledOnce();
  });

  it("keeps a rejection until what it read gives a new promise", async () => {
    let fails = true;
    const source = cell(() =>
      fails ? Promise.reject(new Error("nope")) : Promise.resolve(1),
    );
    const result = derived(async (get) => (await get(source)) * 2);

    const first = read(result);

    await expect(first).rejects.toThrow("nope");
    expect(read(result)).toBe(first);

    fails = false;
    source.invalidate();

    expect(await read(result)).toBe(2);
  });

  it("rejects every read once disposed, with the same promise, without running again", async () => {
    const source = cell(() => Promise.resolve(1));
    const make = vi.fn(async (get: Get) => (await get(source)) * 2);
    const result = derived(make);

    expect(await read(result)).toBe(2);

    result[Symbol.dispose]();
    source.invalidate();
    const first = read(result);

    await expect(first).rejects.toThrow(ReferenceError);
    expect(read(result)).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("disposes what it owns, but not what it read", async () => {
    const source = cell(() => Promise.resolve(1));
    const owned = { [Symbol.dispose]: vi.fn() };
    const result = derived(async (get) => (await get(source)) * 2, owned);

    await read(result);
    result[Symbol.dispose]();
    result[Symbol.dispose]();

    expect(owned[Symbol.dispose]).toHaveBeenCalledOnce();
    expect(await read(source)).toBe(1);
  });
});
