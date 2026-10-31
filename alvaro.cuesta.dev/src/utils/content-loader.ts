import fs from "node:fs/promises";
import path from "node:path";
import { getGitLastModifiedDate, getGitWatchPaths } from "./git.ts";
import { cachedPromise } from "@xenon-ssg/core/promise";
import { watchInDev } from "@xenon-ssg/core/watch";
import {
  analyzeItems,
  type AnalyzedItems,
  type AnalyzeItemsOptions,
} from "./analyze.ts";
import type { ItemModuleDate } from "./item-dates.ts";

type InferredMetadata = {
  lastModificationDate: ItemModuleDate | null;
};

type ParseModule<TModuleParsed> = (
  filename: string,
  rawModule: NodeModule,
  inferredMetadata: InferredMetadata,
) => TModuleParsed;

type ContentLoaderOptions<TModuleParsed> = {
  siteRootPath: string;
  contentFolderPath: string;
  contentFolderUrl: URL;
  parseModule: ParseModule<TModuleParsed>;
  analyzeOptions: AnalyzeItemsOptions<TModuleParsed>;
};

async function loadContentItems<TModuleParsed extends { draft: boolean }>(
  options: ContentLoaderOptions<TModuleParsed>,
): Promise<AnalyzedItems<TModuleParsed>> {
  const {
    siteRootPath,
    contentFolderPath,
    contentFolderUrl,
    parseModule,
    analyzeOptions,
  } = options;

  const filelist = await fs.readdir(contentFolderPath);

  const importedItems = await Promise.all(
    filelist
      .filter((filename) => filename.endsWith(".mdx"))
      .map(async (filename) => {
        const fileUrl = new URL(filename, contentFolderUrl);
        const filePath = path.join(contentFolderPath, filename);
        const [lastModificationDate, rawModule] = await Promise.all([
          getGitLastModifiedDate(
            siteRootPath,
            path.relative(siteRootPath, filePath),
          ),
          import(`${fileUrl}?${Date.now()}`),
        ]);
        const module = parseModule(filename, rawModule, {
          lastModificationDate,
        });

        return { filename, module };
      }),
  );

  const filteredItems = importedItems.filter(
    (item) => process.env["NODE_ENV"] === "development" || !item.module.draft,
  );

  return analyzeItems(filteredItems, analyzeOptions);
}

type ContentLoader<TModuleParsed> = {
  (): Promise<AnalyzedItems<TModuleParsed>>;
};

export function createContentLoader<TModuleParsed extends { draft: boolean }>(
  options: ContentLoaderOptions<TModuleParsed>,
): ContentLoader<TModuleParsed> {
  const cache = cachedPromise(() => loadContentItems(options), { lazy: true });

  // Reset on edits to any file under the content folder, plus to anything
  // git considers a "watch path" (so things like commit metadata changes
  // trigger a re-render of `lastModified` etc.). The outer env check only
  // exists to avoid shelling out to `git` in production builds —
  // `watchInDev` itself is already a no-op outside dev.
  if (process.env["NODE_ENV"] === "development") {
    watchInDev(options.contentFolderPath, () => cache.reset());
    void (async () => {
      const gitWatchPaths = await getGitWatchPaths(options.siteRootPath);
      for (const gitWatchPath of gitWatchPaths) {
        // Git replaces these files by renaming a lock file over them, which
        // ends a watch on the file itself, so watch its folder instead. But
        // only react to the file: other files there (e.g. `.git/index`)
        // change on every `git status`.
        const fileName = path.basename(gitWatchPath);
        watchInDev(path.dirname(gitWatchPath), ({ filename }) => {
          if (filename === fileName) cache.reset();
        });
      }
    })();
  }

  return cache.get;
}
