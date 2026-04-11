import fs from "node:fs/promises";
import path from "node:path";
import { getGitLastModifiedDate, getGitWatchPaths } from "../utils/git";
import { parseMicroblogItemModuleFromImportModule } from "./item-module";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";
import { analyzeMicroblogItems } from "./analyze";

const siteRootPath = path.join(import.meta.dirname, "..", "..");
const microblogFolderPath = path.join(
  import.meta.dirname,
  "..",
  "..",
  "microblog",
);

const loadMicroblogItems = async () => {
  const microblogFolderUrl = new URL(`../../microblog/`, import.meta.url);

  let filelist: string[];
  try {
    filelist = await fs.readdir(microblogFolderPath);
  } catch {
    return analyzeMicroblogItems([]);
  }

  const importedItems = await Promise.all(
    filelist
      .filter((filename) => filename.endsWith(".mdx"))
      .map(async (filename) => {
        const fileUrl = new URL(filename, microblogFolderUrl);
        const filePath = path.join(microblogFolderPath, filename);
        const [lastModificationDate, rawModule] = await Promise.all([
          getGitLastModifiedDate(
            siteRootPath,
            path.posix.relative(siteRootPath, filePath),
          ),
          import(`${fileUrl}?${Date.now()}`),
        ]);
        const module = parseMicroblogItemModuleFromImportModule(
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

  return analyzeMicroblogItems(filteredImportedItems);
};

const { use, reset } = suspendablePromiseMaker(loadMicroblogItems, {
  lazy: true,
});

if (process.env["NODE_ENV"] === "development") {
  const startWatch = async (watchPath: string) => {
    for await (const _ of fs.watch(watchPath)) {
      reset();
    }
  };

  // Only watch if folder exists
  void fs
    .access(microblogFolderPath)
    .then(() => {
      void startWatch(microblogFolderPath);
    })
    .catch(() => {});

  void (async () => {
    const gitWatchPaths = await getGitWatchPaths(siteRootPath);
    for (const gitWatchPath of gitWatchPaths) {
      void startWatch(gitWatchPath);
    }
  })();
}

export const getMicroblogItems = loadMicroblogItems;
export const useMicroblogItems = use;
