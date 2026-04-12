import path from "node:path";
import { parseTimelineItemModuleFromImportModule } from "./item-module";
import type { TimelineItemModuleParsed } from "./item-module";
import { createContentLoader } from "../utils/content-loader";
import { getBlogItems } from "../blog/promise";
import { blogItemToImplicitTimelineItem } from "./implicit-posts";
import { analyzeItems, type AnalyzedItems, type Item } from "../utils/analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";

const getRawTimelineItems = createContentLoader({
  siteRootPath: path.join(import.meta.dirname, "..", ".."),
  contentFolderPath: path.join(import.meta.dirname, "..", "..", "timeline"),
  contentFolderUrl: new URL("../../timeline/", import.meta.url),
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

// Cache merged results by reference identity of inputs
let cachedRaw: AnalyzedItems<TimelineItemModuleParsed> | null = null;
let cachedBlog: AnalyzedItems<BlogItemModuleParsed> | null = null;
let cachedMerged: AnalyzedItems<TimelineItemModuleParsed> | null = null;

function mergeWithCache(
  raw: AnalyzedItems<TimelineItemModuleParsed>,
  blog: AnalyzedItems<BlogItemModuleParsed>,
): AnalyzedItems<TimelineItemModuleParsed> {
  if (raw === cachedRaw && blog === cachedBlog && cachedMerged) {
    return cachedMerged;
  }
  cachedRaw = raw;
  cachedBlog = blog;
  cachedMerged = mergeWithImplicitPosts(raw, blog);
  return cachedMerged;
}

export async function getTimelineItems(): Promise<
  AnalyzedItems<TimelineItemModuleParsed>
> {
  const [raw, blog] = await Promise.all([
    getRawTimelineItems(),
    getBlogItems(),
  ]);
  return mergeWithCache(raw, blog);
}
