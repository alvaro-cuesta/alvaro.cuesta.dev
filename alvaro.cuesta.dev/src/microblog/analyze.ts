import {
  compareBlogItemDates,
  getBlogItemDateMonth,
  getBlogItemDateYear,
  type BlogItemMonth,
} from "../utils/item-dates";
import type { MicroblogItem } from "./item";

type YearData = {
  totalCount: number;
  byMonth: Map<BlogItemMonth, MicroblogItem[]>;
};

export const microblogPostId = (filename: string): string =>
  filename.replace(/\.mdx?$/, "");

export type AnalyzedMicroblogItems = {
  all: MicroblogItem[];
  allSortedByDescendingDate: MicroblogItem[];
  allSortedByDescendingDateByPage: Map<number, MicroblogItem[]>;
  byId: Map<string, MicroblogItem>;
  pageByPostId: Map<string, number>;
  byYear: Map<number, YearData>;
  byTag: Map<string, MicroblogItem[]>;
  yearsSortedDescending: { year: number; data: YearData }[];
  tagsAscendingAlphabetically: { tag: string; items: MicroblogItem[] }[];
  tagsDescendingByArticleCount: { tag: string; items: MicroblogItem[] }[];
};

const ITEMS_PER_PAGE = 10;

export const analyzeMicroblogItems = (
  items: MicroblogItem[],
): AnalyzedMicroblogItems => {
  const allSortedByDescendingDate = items.toSorted((a, b) =>
    compareBlogItemDates(b.module.publicationDate, a.module.publicationDate),
  );

  const allSortedByDescendingDateByPage = new Map<number, MicroblogItem[]>();
  const pageByPostId = new Map<string, number>();
  for (let i = 0; i < allSortedByDescendingDate.length; i += ITEMS_PER_PAGE) {
    const page = Math.floor(i / ITEMS_PER_PAGE) + 1;
    const pageItems = allSortedByDescendingDate.slice(i, i + ITEMS_PER_PAGE);
    allSortedByDescendingDateByPage.set(page, pageItems);

    for (const item of pageItems) {
      pageByPostId.set(microblogPostId(item.filename), page);
    }
  }

  const byId: AnalyzedMicroblogItems["byId"] = new Map();
  const byYear: AnalyzedMicroblogItems["byYear"] = new Map();
  const byTag: AnalyzedMicroblogItems["byTag"] = new Map();

  for (const item of allSortedByDescendingDate) {
    const { module } = item;

    // Add to id map
    const id = microblogPostId(item.filename);
    if (byId.has(id)) {
      throw new Error(
        `Duplicate microblog post id "${id}" -- "${item.filename}" conflicts`,
      );
    }
    byId.set(id, item);

    // Add to year map
    const year = getBlogItemDateYear(module.publicationDate);
    if (!byYear.has(year)) {
      byYear.set(year, { totalCount: 0, byMonth: new Map() });
    }

    const itemsInYear = byYear.get(year)!;
    const month = getBlogItemDateMonth(module.publicationDate);
    if (!itemsInYear.byMonth.has(month)) {
      itemsInYear.byMonth.set(month, []);
    }

    itemsInYear.totalCount++;
    itemsInYear.byMonth.get(month)!.push(item);

    // Add to tag map
    for (const tag of module.tags) {
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
    byId,
    pageByPostId,
    byYear,
    byTag,
    yearsSortedDescending,
    tagsAscendingAlphabetically,
    tagsDescendingByArticleCount,
  };
};
