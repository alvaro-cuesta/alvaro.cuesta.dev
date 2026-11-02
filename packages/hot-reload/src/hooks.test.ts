import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

// Vitest doesn't run Node's module hooks, so this runs a script in Node with
// them, as the dev server does.
//
// It pins what `hotImport` relies on, which Node doesn't document: that it
// resolves an `import()` before the call that makes it returns.
const runWithHooks = async (files: Record<string, string>) => {
  await using folder = await fs.mkdtempDisposable(
    path.join(os.tmpdir(), "xenon-hooks-"),
  );
  for (const [name, source] of Object.entries(files)) {
    await fs.writeFile(path.join(folder.path, name), source);
  }
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--import",
      new URL("./hooks.ts", import.meta.url).href,
      path.join(folder.path, "main.mjs"),
    ],
    { env: { ...process.env, NODE_ENV: "development" } },
  );
  return JSON.parse(stdout) as unknown;
};

const HOT_IMPORT_URL = new URL("./hot-import.ts", import.meta.url).href;
const HOOKS_URL = new URL("./hooks.ts", import.meta.url).href;
const MODULE_STACK_URL = new URL("./module-stack.ts", import.meta.url).href;

const FIXTURES = {
  "package.json": JSON.stringify({ type: "module" }),
  // Written where the hot import isn't loaded, like a site passing a page.
  "writer.mjs": `export const loadPage = () => import("./page.mjs");`,
  "page.mjs": `
    import { dep } from "./dep.mjs";
    globalThis.evaluations = (globalThis.evaluations ?? 0) + 1;
    export const evaluation = globalThis.evaluations;
    export { dep };
  `,
  "dep.mjs": `export const dep = 1;`,
};

describe("hooks", () => {
  it("version what a hot import imports, and import it again once it changes", async () => {
    const result = await runWithHooks({
      ...FIXTURES,
      "main.mjs": `
        import { fileURLToPath } from "node:url";
        import { hotImport, hotImportsOf } from "${HOT_IMPORT_URL}";
        import { invalidate } from "${HOOKS_URL}";
        import { loadPage } from "./writer.mjs";

        const page = hotImport(loadPage);
        const changes = [];
        page.subscribe((reason) => changes.push(reason));

        const first = (await page.load()).evaluation;
        const cached = (await page.load()).evaluation;
        const invalidated = invalidate([
          fileURLToPath(new URL("./dep.mjs", import.meta.url)),
        ]);
        const subscribed = hotImportsOf(invalidated).length;
        const changed = (await page.load()).evaluation;

        console.log(JSON.stringify({
          first,
          cached,
          changed,
          subscribed,
          writerInvalidated: [...invalidated].some((p) => p.endsWith("writer.mjs")),
        }));
      `,
    });

    expect(result).toEqual({
      first: 1,
      cached: 1,
      changed: 2,
      subscribed: 1,
      writerInvalidated: false,
    });
  });

  it("retire what the copies a change replaced own", async () => {
    const result = await runWithHooks({
      ...FIXTURES,
      "page.mjs": `
        import { moduleStack } from "${MODULE_STACK_URL}";
        import { dep } from "./dep.mjs";
        const evaluation = (globalThis.evaluations ?? 0) + 1;
        globalThis.evaluations = evaluation;
        moduleStack(import.meta).use({
          [Symbol.dispose]: () => globalThis.disposed.push(evaluation),
        });
        export { dep };
      `,
      "main.mjs": `
        import { fileURLToPath } from "node:url";
        import { hotImport } from "${HOT_IMPORT_URL}";
        import { invalidate, versionOf } from "${HOOKS_URL}";
        import { retireModules } from "${MODULE_STACK_URL}";
        import { loadPage } from "./writer.mjs";

        globalThis.disposed = [];
        const page = hotImport(loadPage);
        await page.load();

        const retired = retireModules(
          invalidate([fileURLToPath(new URL("./dep.mjs", import.meta.url))]),
          versionOf,
        );
        await page.load();
        const beforeDisposal = [...globalThis.disposed];
        retired.dispose();

        console.log(JSON.stringify({
          beforeDisposal,
          afterDisposal: globalThis.disposed,
        }));
      `,
    });

    expect(result).toEqual({ beforeDisposal: [], afterDisposal: [1] });
  });

  it("reject a hot import that doesn't make exactly one import as it runs", async () => {
    const result = await runWithHooks({
      ...FIXTURES,
      "main.mjs": `
        import { hotImport } from "${HOT_IMPORT_URL}";

        const cached = import("./page.mjs");
        const outcome = (load) =>
          hotImport(load).load().then(() => "loaded", () => "rejected");

        console.log(JSON.stringify({
          cachedPromise: await outcome(() => cached),
          awaitFirst: await outcome(async () => {
            await null;
            return import("./page.mjs");
          }),
          twoImports: await outcome(() =>
            Promise.all([import("./page.mjs"), import("./dep.mjs")]),
          ),
          dependency: await outcome(() => import("node:path")),
        }));
      `,
    });

    expect(result).toEqual({
      cachedPromise: "rejected",
      awaitFirst: "rejected",
      twoImports: "rejected",
      dependency: "loaded",
    });
  });
});
