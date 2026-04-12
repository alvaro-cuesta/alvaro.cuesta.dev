import path from "node:path";
import { parseMicroblogItemModuleFromImportModule } from "./item-module";
import type { MicroblogItemModuleParsed } from "./item-module";
import { createContentLoader } from "../utils/content-loader";
import { getBlogItems, useBlogItems } from "../blog/promise";
import { blogItemToImplicitMicroblogItem } from "./implicit-posts";
import { analyzeItems, type AnalyzedItems, type Item } from "../utils/analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";

const {
  getItems: getRawMicroblogItems,
  useItems: useRawMicroblogItems,
} = createContentLoader({
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

const ANALYZE_OPTIONS = {
  getSlug: (item: { module: MicroblogItemModuleParsed }) => item.module.slug,
  getPublicationDate: (item: { module: MicroblogItemModuleParsed }) =>
    item.module.publicationDate,
  getTags: (item: { module: MicroblogItemModuleParsed }) => item.module.tags,
};

function deduplicateSlugs(
  implicitItems: Item<MicroblogItemModuleParsed>[],
  usedSlugs: Set<string>,
): Item<MicroblogItemModuleParsed>[] {
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
  raw: AnalyzedItems<MicroblogItemModuleParsed>,
  blog: AnalyzedItems<BlogItemModuleParsed>,
): AnalyzedItems<MicroblogItemModuleParsed> {
  const usedSlugs = new Set(raw.all.map((item) => item.module.slug));

  const implicitItems = blog.allSortedByDescendingDate.map(
    blogItemToImplicitMicroblogItem,
  );

  const deduplicatedImplicitItems = deduplicateSlugs(implicitItems, usedSlugs);

  return analyzeItems(
    [...raw.all, ...deduplicatedImplicitItems],
    ANALYZE_OPTIONS,
  );
}

// Cache merged results by reference identity of inputs
let cachedRaw: AnalyzedItems<MicroblogItemModuleParsed> | null = null;
let cachedBlog: AnalyzedItems<BlogItemModuleParsed> | null = null;
let cachedMerged: AnalyzedItems<MicroblogItemModuleParsed> | null = null;

function mergeWithCache(
  raw: AnalyzedItems<MicroblogItemModuleParsed>,
  blog: AnalyzedItems<BlogItemModuleParsed>,
): AnalyzedItems<MicroblogItemModuleParsed> {
  if (raw === cachedRaw && blog === cachedBlog && cachedMerged) {
    return cachedMerged;
  }
  cachedRaw = raw;
  cachedBlog = blog;
  cachedMerged = mergeWithImplicitPosts(raw, blog);
  return cachedMerged;
}

async function getMicroblogItems(): Promise<
  AnalyzedItems<MicroblogItemModuleParsed>
> {
  const [raw, blog] = await Promise.all([
    getRawMicroblogItems(),
    getBlogItems(),
  ]);
  return mergeWithCache(raw, blog);
}

function useMicroblogItems(): AnalyzedItems<MicroblogItemModuleParsed> {
  const raw = useRawMicroblogItems();
  const blog = useBlogItems();
  return mergeWithCache(raw, blog);
}

export { getMicroblogItems, useMicroblogItems };
