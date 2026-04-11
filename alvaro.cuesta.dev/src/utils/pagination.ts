export const ITEMS_PER_PAGE = 10;

export function paginateItems<T>(
  items: T[],
  page: number,
): {
  itemsInPage: T[];
  totalPages: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  const start = (page - 1) * ITEMS_PER_PAGE;
  const itemsInPage = items.slice(start, start + ITEMS_PER_PAGE);

  return { itemsInPage, totalPages };
}
