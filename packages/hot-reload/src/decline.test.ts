import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { declineInDev, isDeclined } from "./decline.ts";

const metaOf = (modulePath: string, version: number) =>
  ({
    url: `${pathToFileURL(modulePath).href}?v=${version}`,
  }) as ImportMeta;

describe("declineInDev", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("declines the module, whichever copy of it declines", () => {
    vi.stubEnv("NODE_ENV", "development");
    const modulePath = path.resolve("src", "server.ts");

    declineInDev(metaOf(modulePath, 3));

    expect(isDeclined(modulePath)).toBe(true);
    expect(isDeclined(path.resolve("src", "other.ts"))).toBe(false);
  });

  it("does nothing outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const modulePath = path.resolve("src", "pool.ts");

    declineInDev(metaOf(modulePath, 0));

    expect(isDeclined(modulePath)).toBe(false);
  });
});
