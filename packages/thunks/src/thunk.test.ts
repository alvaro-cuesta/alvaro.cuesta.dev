import { describe, expect, it, vi } from "vitest";
import { thunk } from "./thunk.ts";

describe("thunk", () => {
  it("doesn't run until it's called", () => {
    const make = vi.fn(() => Promise.resolve(1));
    thunk(make);

    expect(make).not.toHaveBeenCalled();
  });

  it("gives every call the same promise", async () => {
    const make = vi.fn(() => Promise.resolve(1));
    const getValue = thunk(make);

    const first = getValue();

    expect(getValue()).toBe(first);
    expect(await first).toBe(1);
    expect(getValue()).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });

  it("keeps a rejected promise", async () => {
    const make = vi.fn(() => Promise.reject(new Error("nope")));
    const getValue = thunk(make);

    const first = getValue();

    await expect(first).rejects.toThrow("nope");
    expect(getValue()).toBe(first);
    expect(make).toHaveBeenCalledOnce();
  });
});
