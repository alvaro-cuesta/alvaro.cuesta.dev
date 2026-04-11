import {
  compareBlogItemDates,
  getBlogItemDateMonth,
  getBlogItemDateYear,
  type BlogItemDate,
  type BlogItemMonth,
} from "./item-dates";

export type Item<TModuleParsed> = {
  filename: string;
  module: TModuleParsed;
};

type YearData<TModuleParsed> = {
  totalCount: number;
  byMonth: Map<BlogItemMonth, Item<TModuleParsed>[]>;
};

export type AnalyzedItems<TModuleParsed> = {
  all: Item<TModuleParsed>[];
  allSortedByDescendingDate: Item<TModuleParsed>[];
  allSortedByDescendingDateByPage: Map<number, Item<TModuleParsed>[]>;
  bySlug: Map<string, Item<TModuleParsed>>;
  pageBySlug: Map<string, number>;
  byYear: Map<number, YearData<TModuleParsed>>;
  byTag: Map<string, Item<TModuleParsed>[]>;
  yearsSortedDescending: { year: number; data: YearData<TModuleParsed> }[];
  tagsAscendingAlphabetically: {
    tag: string;
    items: Item<TModuleParsed>[];
  }[];
  tagsDescendingByArticleCount: {
    tag: string;
    items: Item<TModuleParsed>[];
  }[];
};

const ITEMS_PER_PAGE = 10;

const RESERVED_SLUGS = new Set(["years", "tags"]);

export type AnalyzeItemsOptions<TModuleParsed> = {
  getSlug: (item: Item<TModuleParsed>) => string;
  getPublicationDate: (item: Item<TModuleParsed>) => BlogItemDate;
  getTags: (item: Item<TModuleParsed>) => string[];
};

export const analyzeItems = <TModuleParsed>(
  items: Item<TModuleParsed>[],
  options: AnalyzeItemsOptions<TModuleParsed>,
): AnalyzedItems<TModuleParsed> => {
  const { getSlug, getPublicationDate, getTags } = options;

  const allSortedByDescendingDate = items.toSorted((a, b) =>
    compareBlogItemDates(getPublicationDate(b), getPublicationDate(a)),
  );

  const allSortedByDescendingDateByPage = new Map<
    number,
    Item<TModuleParsed>[]
  >();
  const pageBySlug = new Map<string, number>();
  for (let i = 0; i < allSortedByDescendingDate.length; i += ITEMS_PER_PAGE) {
    const page = Math.floor(i / ITEMS_PER_PAGE) + 1;
    const pageItems = allSortedByDescendingDate.slice(i, i + ITEMS_PER_PAGE);
    allSortedByDescendingDateByPage.set(page, pageItems);

    for (const item of pageItems) {
      pageBySlug.set(getSlug(item), page);
    }
  }

  const bySlug = new Map<string, Item<TModuleParsed>>();
  const byYear = new Map<number, YearData<TModuleParsed>>();
  const byTag = new Map<string, Item<TModuleParsed>[]>();

  for (const item of allSortedByDescendingDate) {
    const publicationDate = getPublicationDate(item);
    const slug = getSlug(item);

    // Add to slug map
    const existing = bySlug.get(slug);
    if (existing) {
      throw new Error(
        `Duplicate slug "${slug}" -- "${item.filename}" conflicts with "${existing.filename}"`,
      );
    }

    if (RESERVED_SLUGS.has(slug)) {
      throw new Error(`"${item.filename}" has a reserved slug "${slug}".`);
    }

    bySlug.set(slug, item);

    // Add to year map
    const year = getBlogItemDateYear(publicationDate);
    if (!byYear.has(year)) {
      byYear.set(year, { totalCount: 0, byMonth: new Map() });
    }

    const itemsInYear = byYear.get(year)!;
    const month = getBlogItemDateMonth(publicationDate);
    if (!itemsInYear.byMonth.has(month)) {
      itemsInYear.byMonth.set(month, []);
    }

    itemsInYear.totalCount++;
    itemsInYear.byMonth.get(month)!.push(item);

    // Add to tag map
    const tags = getTags(item);
    for (const tag of tags) {
      if (!byTag.has(tag)) {
        byTag.set(tag, []);
      }
      byTag.get(tag)!.push(item);
    }
  }

  const yearsSortedDescending = [...byYear.entries()]
    .map(([year, data]) => ({ year, data }))
    .sort((a, b) => b.year - a.year);

  const tagsAscendingAlphabetically = [...byTag.entries()]
    .map(([tag, items]) => ({ tag, items }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  const tagsDescendingByArticleCount = [...byTag.entries()]
    .map(([tag, items]) => ({ tag, items }))
    .sort((a, b) => b.items.length - a.items.length);

  return {
    all: items,
    allSortedByDescendingDate,
    allSortedByDescendingDateByPage,
    bySlug,
    pageBySlug,
    byYear,
    byTag,
    yearsSortedDescending,
    tagsAscendingAlphabetically,
    tagsDescendingByArticleCount,
  };
};
