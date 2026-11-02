import fs from "node:fs/promises";
import { contentFile } from "./content-file.ts";
import { cell, derived, family, type Thunk } from "@xenon-ssg/thunks";
import { watchInDev } from "@xenon-ssg/hot-reload";
import { toFileUrl } from "@xenon-ssg/import-url";
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
  rawModule: unknown,
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

  // One content file per file, so a change only imports again the files it
  // reaches (see `contentFile`).
  const fileFor = family((filename: string) =>
    contentFile(toFileUrl(new URL(filename, contentFolderUrl))),
  );

  // Disposed along with the loader, which stops watching the folder and
  // handling changes to its files: nothing else reads them.
  const owned = new DisposableStack();
  owned.use(files);
  owned.use(fileFor);

  return derived(async (get) => {
    const filelist = await get(files);

    // Changes to removed files stop being handled.
    fileFor.retain(filelist);

    const importedItems = await Promise.all(
      filelist.map(async (filename) => {
        const { module: rawModule, gitDates } = await get(fileFor(filename));
        const module = parseModule(filename, rawModule, {
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
