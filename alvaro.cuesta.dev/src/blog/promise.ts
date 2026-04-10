import fs from "node:fs/promises";
import path from "node:path";
import { getGitLastModifiedDate, getGitWatchPaths } from "./git";
import { parseBlogItemModuleFromImportModule } from "./item-module";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";
import { analyzeBlogItems } from "./analyze";

const siteRootPath = path.join(import.meta.dirname, "..", "..");
const blogFolderPath = path.join(import.meta.dirname, "..", "..", "blog");

const loadBlogItems = async () => {
  const blogFolderUrl = new URL(`../../blog/`, import.meta.url);

  const filelist = await fs.readdir(blogFolderPath);

  const importedItems = await Promise.all(
    filelist
      .filter((filename) => filename.endsWith(".mdx"))
      .map(async (filename) => {
        const fileUrl = new URL(filename, blogFolderUrl);
        const lastModificationDate = await getGitLastModifiedDate(
          siteRootPath,
          path.posix.relative(
            siteRootPath,
            path.join(blogFolderPath, filename),
          ),
        );
        const rawModule = await import(`${fileUrl}?${Date.now()}`);
        const module = parseBlogItemModuleFromImportModule(
          filename,
          rawModule,
          { lastModificationDate },
        );

        return {
          filename,
          module,
        };
      }),
  );

  const filteredImportedItems = importedItems.filter(
    (item) => process.env["NODE_ENV"] === "development" || !item.module.draft,
  );

  return analyzeBlogItems(filteredImportedItems);
};

const { use, reset } = suspendablePromiseMaker(loadBlogItems, {
  lazy: true,
});

// Watch blog folder for changes. This is needed because `tsx` already detects changes in the import chain, but not if
// files are added or removed.
if (process.env["NODE_ENV"] === "development") {
  const startWatch = async (watchPath: string) => {
    for await (const _ of fs.watch(watchPath)) {
      reset();
    }
  };

  void startWatch(blogFolderPath);

  // Also watch Git metadata for changes, which can affect the last modified dates of blog items.
  void (async () => {
    const gitWatchPaths = await getGitWatchPaths(siteRootPath);
    for (const gitWatchPath of gitWatchPaths) {
      void startWatch(gitWatchPath);
    }
  })();
}

export const getBlogItems = loadBlogItems;
export const useBlogItems = use;
