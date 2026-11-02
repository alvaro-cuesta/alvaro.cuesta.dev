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
    const current = cell(make);

    const first = read(current);

    expect(read(current)).toBe(first);
    expect(await first).toBe(1);

    value = 2;
    current.invalidate();
    const second = read(current);

    expect(second).not.toBe(first);
    expect(read(current)).toBe(second);
    expect(await second).toBe(2);
    expect(await first).toBe(1);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it("doesn't run again when invalidated, only when read after", () => {
    const make = vi.fn(() => Promise.resolve(1));
    const current = cell(make);

    read(current);
    current.invalidate();
    current.invalidate();

    expect(make).toHaveBeenCalledOnce();

    read(current);

    expect(make).toHaveBeenCalledTimes(2);
  });

  it("keeps a rejected promise until it's invalidated", async () => {
    let fails = true;
    const make = vi.fn(() =>
      fails ? Promise.reject(new Error("nope")) : Promise.resolve(1),
    );
    const current = cell(make);

    const first = read(current);

    await expect(first).rejects.toThrow("nope");
    expect(read(current)).toBe(first);

    fails = false;
    current.invalidate();

    expect(await read(current)).toBe(1);
  });

  it("isn't subscribed until it's read, and then only once", () => {
    const subscribe = vi.fn(() => ({ [Symbol.dispose]: () => {} }));
    const current = cell(() => Promise.resolve(1), subscribe);

    expect(subscribe).not.toHaveBeenCalled();

    read(current);
    read(current);

    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("runs again once what it's subscribed to invalidates it", async () => {
    let value = 1;
    let invalidate = () => {};
    const current = cell(
      () => Promise.resolve(value),
      (newInvalidate) => {
        invalidate = newInvalidate;
        return { [Symbol.dispose]: () => {} };
      },
    );

    expect(await read(current)).toBe(1);

    value = 2;
    invalidate();

    expect(await read(current)).toBe(2);
  });

  it("can be made from a source that loads its value and invalidates it", async () => {
    let value = 1;
    let invalidate = () => {};
    const current = cell({
      load: () => Promise.resolve(value),
      subscribe: (newInvalidate) => {
        invalidate = newInvalidate;
        return { [Symbol.dispose]: () => {} };
      },
    });

    expect(await read(current)).toBe(1);

    value = 2;
    invalidate();

    expect(await read(current)).toBe(2);
  });

  it("stops what it's subscribed to once disposed, and isn't subscribed again", async () => {
    const dispose = vi.fn();
    const subscribe = vi.fn(() => ({ [Symbol.dispose]: dispose }));
    const current = cell(() => Promise.resolve(1), subscribe);

    read(current);
    current[Symbol.dispose]();
    current[Symbol.dispose]();

    expect(dispose).toHaveBeenCalledOnce();
    await expect(read(current)).rejects.toThrow(ReferenceError);
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("rejects every read once disposed, with the same promise, without running again", async () => {
    const make = vi.fn(() => Promise.resolve(1));
    const current = cell(make);

    expect(await read(current)).toBe(1);

    current[Symbol.dispose]();
    current.invalidate();
    const first = read(current);

    await expect(first).rejects.toThrow(ReferenceError);
    expect(read(current)).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("stops what it's subscribed to once it has started, if disposed before then", async () => {
    const dispose = vi.fn();
    const started = Promise.withResolvers<Disposable>();
    const current = cell(
      () => Promise.resolve(1),
      () => started.promise,
    );

    read(current);
    current[Symbol.dispose]();

    expect(dispose).not.toHaveBeenCalled();

    started.resolve({ [Symbol.dispose]: dispose });
    await started.promise;

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("is never subscribed if disposed before it's read", () => {
    const subscribe = vi.fn(() => ({ [Symbol.dispose]: () => {} }));
    const current = cell(() => Promise.resolve(1), subscribe);

    current[Symbol.dispose]();
    read(current).catch(() => {});

    expect(subscribe).not.toHaveBeenCalled();
  });
});
