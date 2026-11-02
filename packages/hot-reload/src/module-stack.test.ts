import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { moduleStack, retireCopies } from "./module-stack.ts";

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

describe("retireCopies", () => {
  // Every other test's copies are kept, so this only retires its own.
  const only = (name: string) => (url: string) =>
    url.startsWith(pathToFileURL(pathOf(name)).href);

  it("hands over what the copies it's told to retire own, once", () => {
    const retiredCopy = owning(moduleStack(copyOf("retired", 0)));
    const keptCopy = owning(moduleStack(copyOf("kept", 0)));

    const retired = retireCopies(only("retired"));

    expect(retiredCopy).not.toHaveBeenCalled();

    retired?.dispose();
    retireCopies(only("retired"))?.dispose();

    expect(retiredCopy).toHaveBeenCalledOnce();
    expect(keptCopy).not.toHaveBeenCalled();
  });

  it("hands over nothing when it retires nothing", () => {
    moduleStack(copyOf("none", 0));

    expect(retireCopies(() => false)).toBeUndefined();
  });

  // E.g. one a load that started before a change evaluates after it: it's
  // still out of date, so the next call retires it too.
  it("gives a copy a new stack once its stack is retired", () => {
    const retiredStack = moduleStack(copyOf("again", 1));
    retireCopies(only("again"))?.dispose();

    const stack = moduleStack(copyOf("again", 1));
    expect(stack).not.toBe(retiredStack);
    const late = owning(stack);

    retireCopies(only("again"))?.dispose();
    expect(late).toHaveBeenCalledOnce();
  });
});
