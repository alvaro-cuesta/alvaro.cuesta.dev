import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseTimelineItemModuleFromImportModule } from "./item-module.ts";
import type { TimelineItemModuleParsed } from "./item-module.ts";
import { createContentLoader } from "../utils/content-loader.ts";
import { SITE_ROOT_FOLDER } from "../../config.ts";
import { getBlogItems } from "../blog/promise.ts";
import { blogItemToImplicitTimelineItem } from "./implicit-posts.tsx";
import { analyzeItems, type AnalyzedItems, type Item } from "../utils/analyze.ts";
import type { BlogItemModuleParsed } from "../blog/item-module.ts";
import { derived } from "@xenon-ssg/thunks";

const TIMELINE_FOLDER = path.join(SITE_ROOT_FOLDER, "timeline");

const getRawTimelineItems = createContentLoader({
  siteRootPath: SITE_ROOT_FOLDER,
  contentFolderPath: TIMELINE_FOLDER,
  contentFolderUrl: pathToFileURL(TIMELINE_FOLDER + path.sep),
  parseModule: parseTimelineItemModuleFromImportModule,
  analyzeOptions: {
    getSlug: (item) => item.module.slug,
    getPublicationDate: (item) => item.module.publicationDate,
    getTags: (item) => item.module.tags,
  },
});

const ANALYZE_OPTIONS = {
  getSlug: (item: { module: TimelineItemModuleParsed }) => item.module.slug,
  getPublicationDate: (item: { module: TimelineItemModuleParsed }) =>
    item.module.publicationDate,
  getTags: (item: { module: TimelineItemModuleParsed }) => item.module.tags,
};

function deduplicateSlugs(
  implicitItems: Item<TimelineItemModuleParsed>[],
  usedSlugs: Set<string>,
): Item<TimelineItemModuleParsed>[] {
  return implicitItems.map((item) => {
    let slug = item.module.slug;

    while (usedSlugs.has(slug)) {
      // Bump the last minute digit to find a free slot
      const num = parseInt(slug, 10) + 1;
      slug = num.toString().padStart(12, "0");
    }

    usedSlugs.add(slug);

    if (slug === item.module.slug) {
      return item;
    }

    return {
      ...item,
      module: { ...item.module, slug },
    };
  });
}

function mergeWithImplicitPosts(
  raw: AnalyzedItems<TimelineItemModuleParsed>,
  blog: AnalyzedItems<BlogItemModuleParsed>,
): AnalyzedItems<TimelineItemModuleParsed> {
  const usedSlugs = new Set(raw.all.map((item) => item.module.slug));

  const implicitItems = blog.allSortedByDescendingDate.map(
    blogItemToImplicitTimelineItem,
  );

  const deduplicatedImplicitItems = deduplicateSlugs(implicitItems, usedSlugs);

  return analyzeItems(
    [...raw.all, ...deduplicatedImplicitItems],
    ANALYZE_OPTIONS,
  );
}

/** The timeline's posts, plus one for each blog article. */
export const getTimelineItems = derived(async (get) => {
  const [raw, blog] = await Promise.all([
    get(getRawTimelineItems),
    get(getBlogItems),
  ]);
  return mergeWithImplicitPosts(raw, blog);
});

/**
 * The post with that slug.
 *
 * Rejects when there's none.
 */
export async function getTimelineItem(
  slug: string,
): Promise<Item<TimelineItemModuleParsed>> {
  const item = (await getTimelineItems()).bySlug.get(slug);

  if (item === undefined) {
    throw new Error(`Timeline post "${slug}" not found`);
  }

  return item;
}
