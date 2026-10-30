import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseBlogItemModuleFromImportModule } from "./item-module.ts";
import { createContentLoader } from "../utils/content-loader.ts";
import { SITE_ROOT_FOLDER } from "../../config.ts";

const BLOG_FOLDER = path.join(SITE_ROOT_FOLDER, "blog");

const UNCATEGORIZED_TAG = "uncategorized";

export const getBlogItems = createContentLoader({
  siteRootPath: SITE_ROOT_FOLDER,
  contentFolderPath: BLOG_FOLDER,
  contentFolderUrl: pathToFileURL(BLOG_FOLDER + path.sep),
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
