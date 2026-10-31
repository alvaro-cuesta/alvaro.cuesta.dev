import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

export type XenonCache = {
  /** Read a cache entry by key. Returns `null` on miss. */
  get(key: string): Promise<Buffer | null>;
  /** Write a cache entry. Creates the backing directory as needed. */
  set(key: string, value: Buffer | Uint8Array | string): Promise<void>;
  /**
   * Return a child cache whose entries live under `<rootDir>/<name>/`. Used
   * by individual plugins to carve out their own keyspace so they can't
   * collide on key names.
   */
  namespace(name: string): XenonCache;
};

const makeXenonCache = (rootDir: string): XenonCache => ({
  async get(key) {
    const filepath = path.join(rootDir, key);
    try {
      return await fs.readFile(filepath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },
  async set(key, value) {
    const filepath = path.join(rootDir, key);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, value);
  },
  namespace(name) {
    return makeXenonCache(path.join(rootDir, name));
  },
});

/**
 * Resolve the consuming site's `node_modules/.cache/@xenon-ssg/express/`
 * directory starting from the caller's `import.meta.url`.
 *
 * Why `callerUrl` and not e.g. `process.cwd()` or the plugin's own module
 * location: in a pnpm workspace, `node_modules/@xenon-ssg/express` is a
 * symlink back to the workspace source, and Node realpath's the symlink
 * before setting the plugin's `import.meta.url`. So from inside the plugin,
 * module resolution walks up from the workspace source and never finds the
 * consuming site's `node_modules`. The caller's URL (e.g. `site.tsx`)
 * hasn't been realpath'd — it's the site's own source file — so module
 * resolution from it correctly finds `<site>/node_modules/`.
 */
const resolveCacheRoot = async (callerUrl: string): Promise<string> => {
  const req = createRequire(callerUrl);
  const paths = req.resolve.paths("@xenon-ssg/express");
  if (!paths) {
    throw new Error(
      `createXenonCache: could not get module search paths from ${callerUrl}`,
    );
  }
  for (const candidate of paths) {
    try {
      await fs.access(path.join(candidate, "@xenon-ssg/express"));
      return path.join(candidate, ".cache", "@xenon-ssg/express");
    } catch {
      // not this one, keep looking
    }
  }
  throw new Error(
    `createXenonCache: @xenon-ssg/express not found in any node_modules reachable from ${callerUrl}`,
  );
};

export type CreateXenonCacheOptions = {
  /** The caller's `import.meta.url`, used to locate the site's node_modules. */
  callerUrl: string;
};

export const createXenonCache = async ({
  callerUrl,
}: CreateXenonCacheOptions): Promise<XenonCache> => {
  const rootDir = await resolveCacheRoot(callerUrl);
  return makeXenonCache(rootDir);
};
