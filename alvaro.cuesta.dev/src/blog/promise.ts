import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseBlogItemModuleFromImportModule } from "./item-module.ts";
import { createContentLoader } from "../utils/content-loader.ts";
import { derived } from "@xenon-ssg/thunks";
import { SITE_ROOT_FOLDER } from "../../config.ts";

const BLOG_FOLDER = path.join(SITE_ROOT_FOLDER, "blog");

const UNCATEGORIZED_TAG = "uncategorized";

export const getBlogItems = createContentLoader({
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

// One thunk for all slugs, not one per slug: slugs come from requests, so
// there'd be no end to them.
/**
 * Finds the article with a slug.
 *
 * The function throws when there's none.
 */
export const getBlogItem = derived(async (get) => {
  const { bySlug } = await get(getBlogItems);

  return (slug: string) => {
    const item = bySlug.get(slug);

    if (item === undefined) {
      throw new Error(`Article ${slug} not found`);
    }

    return item;
  };
});
