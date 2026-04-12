import fs from "node:fs/promises";
import path from "node:path";
import { getGitLastModifiedDate, getGitWatchPaths } from "./git";
import { cachedPromise } from "xenon-ssg/src/promise";
import {
  analyzeItems,
  type AnalyzedItems,
  type AnalyzeItemsOptions,
} from "./analyze";
import type { ItemModuleDate } from "./item-dates";

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

  if (process.env["NODE_ENV"] === "development") {
    const startWatch = async (watchPath: string) => {
      for await (const _ of fs.watch(watchPath)) {
        cache.reset();
      }
    };

    void startWatch(options.contentFolderPath);

    void (async () => {
      const gitWatchPaths = await getGitWatchPaths(options.siteRootPath);
      for (const gitWatchPath of gitWatchPaths) {
        void startWatch(gitWatchPath);
      }
    })();
  }

  return cache.get;
}
