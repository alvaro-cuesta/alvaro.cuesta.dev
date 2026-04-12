import path from "node:path";
import { parseBlogItemModuleFromImportModule } from "./item-module";
import { createContentLoader } from "../utils/content-loader";

const UNCATEGORIZED_TAG = "uncategorized";

export const getBlogItems = createContentLoader({
  siteRootPath: path.join(import.meta.dirname, "..", ".."),
  contentFolderPath: path.join(import.meta.dirname, "..", "..", "blog"),
  contentFolderUrl: new URL("../../blog/", import.meta.url),
  parseModule: parseBlogItemModuleFromImportModule,
  analyzeOptions: {
    getSlug: (item) => item.module.slug,
    getPublicationDate: (item) => item.module.publicationDate,
    getTags: (item) => {
      const tags = item.module.tags;
      return tags.length === 0
        ? [UNCATEGORIZED_TAG]
        : tags.map((tag) => tag.slug);
    },
  },
});
