import {
  compareBlogItemDates,
  getBlogItemDateMonth,
  getBlogItemDateYear,
  type BlogItemMonth,
} from "./item-dates";
import type { BlogItem } from "./item";

type YearData = {
  totalCount: number;
  byMonth: Map<BlogItemMonth, BlogItem[]>;
};

export type AnalyzedBlogItems = {
  all: BlogItem[];
  allSortedByDescendingDate: BlogItem[];
  allSortedByDescendingDateByPage: Map<number, BlogItem[]>;
  bySlug: Map<string, BlogItem>;
  byYear: Map<number, YearData>;
  byTag: Map<string, BlogItem[]>;
  yearsSortedDescending: { year: number; data: YearData }[];
  tagsAscendingAlphabetically: { tag: string; items: BlogItem[] }[];
  tagsDescendingByArticleCount: { tag: string; items: BlogItem[] }[];
};

export const UNCATEGORIZED_TAG = "uncategorized";

const ITEMS_PER_PAGE = 10;

const RESERVED_SLUGS = new Set(["years", "tags"]);

export const analyzeBlogItems = (items: BlogItem[]): AnalyzedBlogItems => {
  const allSortedByDescendingDate = items.toSorted(
    (a, b) =>
      compareBlogItemDates(b.module.publicationDate, a.module.publicationDate) *
      -1,
  );

  const allSortedByDescendingDateByPage = new Map<number, BlogItem[]>();
  for (let i = 0; i < allSortedByDescendingDate.length; i += ITEMS_PER_PAGE) {
    allSortedByDescendingDateByPage.set(
      Math.floor(i / ITEMS_PER_PAGE) + 1,
      allSortedByDescendingDate.slice(i, i + ITEMS_PER_PAGE),
    );
  }

  const bySlug: AnalyzedBlogItems["bySlug"] = new Map();
  const byYear: AnalyzedBlogItems["byYear"] = new Map();
  const byTag: AnalyzedBlogItems["byTag"] = new Map();

  for (const { filename, module } of allSortedByDescendingDate) {
    // Add article to slug map
    const oldBySlug = bySlug.get(module.slug);
    if (oldBySlug) {
      throw new Error(
        `Duplicate slug "${module.slug}" -- "${filename}" tried to overwrite "${oldBySlug.filename}"`,
      );
    }

    if (RESERVED_SLUGS.has(module.slug)) {
      throw new Error(
        `The blog post "${filename}" has a reserved slug "${module.slug}".`,
      );
    }

    bySlug.set(module.slug, { filename, module });

    // Add article to date map
    const year = getBlogItemDateYear(module.publicationDate);
    if (!byYear.has(year)) {
      byYear.set(year, {
        totalCount: 0,
        byMonth: new Map(),
      });
    }

    const itemsInYear = byYear.get(year)!;

    const month = getBlogItemDateMonth(module.publicationDate);
    if (!itemsInYear.byMonth.has(month)) {
      itemsInYear.byMonth.set(month, []);
    }

    itemsInYear.totalCount++;
    itemsInYear.byMonth.get(month)!.push({ filename, module });

    // Add article to tag map
    const tags = module.tags.length === 0 ? [UNCATEGORIZED_TAG] : module.tags;
    for (const tag of tags) {
      if (!byTag.has(tag)) {
        byTag.set(tag, []);
      }
      byTag.get(tag)!.push({ filename, module });
    }
  }

  // Since we've been accumulating from an already-sorted list, we don't need to sort again any of the sub-arrays

  const yearsSortedDescending = [...byYear.entries()]
    .map(([year, data]) => ({ year, data }))
    .sort((a, b) => b.year - a.year);

  const tagsAscendingAlphabetically = [...byTag.entries()]
    .map(([tag, items]) => ({
      tag,
      items,
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  const tagsDescendingByArticleCount = [...byTag.entries()]
    .map(([tag, items]) => ({
      tag,
      items,
    }))
    .sort((a, b) => b.items.length - a.items.length);

  return {
    all: items,
    allSortedByDescendingDate,
    allSortedByDescendingDateByPage,
    bySlug,
    byYear,
    byTag,
    yearsSortedDescending,
    tagsAscendingAlphabetically,
    tagsDescendingByArticleCount,
  };
};
