import fs from "node:fs/promises";
import path from "node:path";
import { getGitFileDates, gitHead, ignoredRevs } from "./git.ts";
import { cell, derived, type Thunk } from "@xenon-ssg/thunks";
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

type GitState = {
  head: string | null;
  ignoredRevs: Set<string>;
};

async function loadContentItems<TModuleParsed extends { draft: boolean }>(
  options: ContentLoaderOptions<TModuleParsed>,
  filelist: string[],
  { head, ignoredRevs }: GitState,
): Promise<AnalyzedItems<TModuleParsed>> {
  const {
    contentFolderPath,
    contentFolderUrl,
    parseModule,
    analyzeOptions,
  } = options;

  const importedItems = await Promise.all(
    filelist
      .map(async (filename) => {
        const fileUrl = new URL(filename, contentFolderUrl);
        const filePath = path.join(contentFolderPath, filename);
        const [gitDates, rawModule] = await Promise.all([
          getGitFileDates(filePath, head, ignoredRevs),
          import(`${fileUrl}?${Date.now()}`),
        ]);
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
}

export function createContentLoader<TModuleParsed extends { draft: boolean }>(
  options: ContentLoaderOptions<TModuleParsed>,
): Thunk<AnalyzedItems<TModuleParsed>> {
  // The folder's files, read again on any change in it: an edit to a file is
  // a change to the folder too, and the items are made from what the files hold.
  const files = cell(() =>
    Array.fromAsync(fs.glob("*.mdx", { cwd: options.contentFolderPath })),
  );
  watchInDev(options.contentFolderPath, () => files.invalidate());

  // Their dates come from git, so the items change when `HEAD` moves or the
  // ignored commits do, too.
  return derived(async (get) => {
    const [filelist, head, revs] = await Promise.all([
      get(files),
      get(gitHead(options.siteRootPath)),
      get(ignoredRevs(options.siteRootPath)),
    ]);

    return loadContentItems(options, filelist, { head, ignoredRevs: revs });
  });
}
