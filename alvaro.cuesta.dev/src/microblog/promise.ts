import path from "node:path";
import { parseMicroblogItemModuleFromImportModule } from "./item-module";
import { createContentLoader } from "../utils/content-loader";

const { getItems: getMicroblogItems, useItems: useMicroblogItems } =
  createContentLoader({
    siteRootPath: path.join(import.meta.dirname, "..", ".."),
    contentFolderPath: path.join(import.meta.dirname, "..", "..", "microblog"),
    contentFolderUrl: new URL("../../microblog/", import.meta.url),
    parseModule: parseMicroblogItemModuleFromImportModule,
    analyzeOptions: {
      getSlug: (item) => item.module.slug,
      getPublicationDate: (item) => item.module.publicationDate,
      getTags: (item) => item.module.tags,
    },
  });

export { getMicroblogItems, useMicroblogItems };
