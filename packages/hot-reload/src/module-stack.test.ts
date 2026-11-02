import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { moduleStack, retireModules } from "./module-stack.ts";

const pathOf = (name: string) => path.resolve("app", `${name}.ts`);
// Copies' URLs as the hooks version them, without loading them: only the
// hooks evaluate a module again.
const copyOf = (name: string, version: number) =>
  ({ url: `${pathToFileURL(pathOf(name)).href}?v=${version}` }) as ImportMeta;

const owning = (stack: DisposableStack) => {
  const dispose = vi.fn();
  stack.use({ [Symbol.dispose]: dispose });
  return dispose;
};

describe("moduleStack", () => {
  it("gives every call from the same copy the same stack", () => {
    expect(moduleStack(copyOf("same", 0))).toBe(moduleStack(copyOf("same", 0)));
    expect(moduleStack(copyOf("same", 0))).not.toBe(
      moduleStack(copyOf("same", 1)),
    );
  });

  it("gives a module that isn't versioned a new stack every time", () => {
    const meta = {
      url: pathToFileURL(pathOf("unversioned")).href,
    } as ImportMeta;

    expect(moduleStack(meta)).not.toBe(moduleStack(meta));
  });
});

describe("retireModules", () => {
  it("hands over what the copies of the modules a change reached own", () => {
    const changed = owning(moduleStack(copyOf("changed", 0)));
    const unchanged = owning(moduleStack(copyOf("unchanged", 0)));

    const retired = retireModules(new Set([pathOf("changed")]), () => 1);

    expect(changed).not.toHaveBeenCalled();

    retired.dispose();

    expect(changed).toHaveBeenCalledOnce();
    expect(unchanged).not.toHaveBeenCalled();
  });

  it("only retires a copy once", () => {
    const dispose = owning(moduleStack(copyOf("once", 0)));

    retireModules(new Set([pathOf("once")]), () => 1).dispose();
    retireModules(new Set([pathOf("once")]), () => 2).dispose();

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("retires a copy evaluated after it was out of date with the next change", () => {
    retireModules(new Set([pathOf("late")]), () => 2).dispose();
    const late = owning(moduleStack(copyOf("late", 1)));
    const latest = owning(moduleStack(copyOf("latest", 2)));

    retireModules(new Set(), () => undefined).dispose();

    expect(late).toHaveBeenCalledOnce();
    expect(latest).not.toHaveBeenCalled();
  });

  it("gives a copy a new stack once its late one is retired", () => {
    retireModules(new Set([pathOf("late-again")]), () => 2).dispose();
    const retiredStack = moduleStack(copyOf("late-again", 1));
    retireModules(new Set(), () => undefined).dispose();

    const stack = moduleStack(copyOf("late-again", 1));
    expect(stack).not.toBe(retiredStack);
    const late = owning(stack);

    // Still out of date, so the next change retires it too.
    retireModules(new Set(), () => undefined).dispose();
    expect(late).toHaveBeenCalledOnce();
  });
});
