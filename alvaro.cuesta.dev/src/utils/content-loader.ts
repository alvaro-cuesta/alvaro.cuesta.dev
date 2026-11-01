import fs from "node:fs/promises";
import { contentFile } from "./content-file.ts";
import { cell, derived, family, type Thunk } from "@xenon-ssg/thunks";
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
  contentFolderPath: string;
  contentFolderUrl: URL;
  parseModule: ParseModule<TModuleParsed>;
  analyzeOptions: AnalyzeItemsOptions<TModuleParsed>;
};

export function createContentLoader<TModuleParsed extends { draft: boolean }>(
  options: ContentLoaderOptions<TModuleParsed>,
): Thunk<AnalyzedItems<TModuleParsed>> & Disposable {
  const {
    contentFolderPath,
    contentFolderUrl,
    parseModule,
    analyzeOptions,
  } = options;

  // The folder's files, read again on any change in it: the watcher can't tell
  // an added or removed file from an edited one, and only the list knows.
  const files = cell(
    () => Array.fromAsync(fs.glob("*.mdx", { cwd: contentFolderPath })),
    (invalidate) => watchInDev(contentFolderPath, invalidate),
  );

  // Each file watches itself, so only the ones that changed are read again.
  const fileFor = family((filename: string) =>
    contentFile(new URL(filename, contentFolderUrl).href),
  );

  // Disposed along with the loader, which stops watching the folder and its
  // files: nothing else reads them.
  const owned = new DisposableStack();
  owned.use(files);
  owned.use(fileFor);

  return derived(async (get) => {
    const filelist = await get(files);

    // Removed files stop being watched.
    fileFor.retain(filelist);

    const importedItems = await Promise.all(
      filelist.map(async (filename) => {
        const { module: rawModule, gitDates } = await get(fileFor(filename));
        const module = parseModule(filename, rawModule as NodeModule, {
          lastModificationDate: gitDates?.lastModifiedAt ?? null,
        });

        return { filename, module };
      }),
    );

    const filteredItems = importedItems.filter(
      (item) => process.env["NODE_ENV"] === "development" || !item.module.draft,
    );

    return analyzeItems(filteredItems, analyzeOptions);
  }, owned);
}
