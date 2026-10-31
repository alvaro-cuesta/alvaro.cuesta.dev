import { DATETIME_INPUT_TZ } from "../../config.ts";

export type BlogItemMonth =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | null; // null means "No month specified"

export type BlogItemDate =
  | {
      type: "year";
      year: number;
    }
  | {
      type: "yearMonth";
      yearMonth: Temporal.PlainYearMonth;
    }
  | {
      type: "date";
      date: Temporal.PlainDate;
    }
  | {
      type: "dateTimeNoSeconds";
      dateTime: Temporal.PlainDateTime;
    }
  | {
      type: "dateTimeWithSeconds";
      dateTime: Temporal.PlainDateTime;
    };

export const isBlogItemDate = (x: unknown): x is BlogItemDate => {
  if (typeof x !== "object" || x === null) {
    return false;
  }

  const obj = x as {};

  if (!("type" in obj) || typeof obj["type"] !== "string") {
    return false;
  }

  switch (obj.type) {
    case "year":
      return "year" in obj && typeof obj.year === "number";
    case "yearMonth":
      return (
        "yearMonth" in obj && obj.yearMonth instanceof Temporal.PlainYearMonth
      );
    case "date":
      return "date" in obj && obj.date instanceof Temporal.PlainDate;
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds":
      return (
        "dateTime" in obj && obj.dateTime instanceof Temporal.PlainDateTime
      );
    default:
      return false;
  }
};

// #region Utility functions

export const getBlogItemDateYear = (blogItemDate: BlogItemDate): number => {
  switch (blogItemDate.type) {
    case "year":
      return blogItemDate.year;
    case "yearMonth":
      return blogItemDate.yearMonth.year;
    case "date":
      return blogItemDate.date.year;
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds":
      return blogItemDate.dateTime.year;
    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unexpected type: ${blogItemDate.type}`);
  }
};

export const getBlogItemDateMonth = (
  blogItemDate: BlogItemDate,
): BlogItemMonth => {
  switch (blogItemDate.type) {
    case "year":
      return null;
    case "yearMonth":
      return blogItemDate.yearMonth.month as BlogItemMonth; // `as` is safe because we know the Temporal months are in range
    case "date":
      return blogItemDate.date.month as BlogItemMonth; // `as` is safe because we know the Temporal months are in range
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds":
      return blogItemDate.dateTime.month as BlogItemMonth; // `as` is safe because we know the Temporal months are in range
    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unexpected type: ${blogItemDate.type}`);
  }
};

const DEFAULT_PLAIN_DATE_TIME_PARTS: Temporal.PlainDateTimeLike = {
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
  microsecond: 0,
  nanosecond: 0,
};

export const blogItemDateToPlainDateTime = (
  blogItemDate: BlogItemDate,
): Temporal.PlainDateTime => {
  switch (blogItemDate.type) {
    case "year":
      return Temporal.PlainDateTime.from(
        { ...DEFAULT_PLAIN_DATE_TIME_PARTS, year: blogItemDate.year },
        { overflow: "reject" },
      );
    case "yearMonth":
      return Temporal.PlainDateTime.from(
        {
          ...DEFAULT_PLAIN_DATE_TIME_PARTS,
          year: blogItemDate.yearMonth.year,
          month: blogItemDate.yearMonth.month,
        },
        { overflow: "reject" },
      );
    case "date":
      return Temporal.PlainDateTime.from(
        {
          ...DEFAULT_PLAIN_DATE_TIME_PARTS,
          year: blogItemDate.date.year,
          month: blogItemDate.date.month,
          day: blogItemDate.date.day,
        },
        { overflow: "reject" },
      );
    case "dateTimeNoSeconds":
      return Temporal.PlainDateTime.from(
        {
          ...DEFAULT_PLAIN_DATE_TIME_PARTS,
          year: blogItemDate.dateTime.year,
          month: blogItemDate.dateTime.month,
          day: blogItemDate.dateTime.day,
          hour: blogItemDate.dateTime.hour,
          minute: blogItemDate.dateTime.minute,
        },
        { overflow: "reject" },
      );
    case "dateTimeWithSeconds":
      return Temporal.PlainDateTime.from(
        {
          ...DEFAULT_PLAIN_DATE_TIME_PARTS,
          year: blogItemDate.dateTime.year,
          month: blogItemDate.dateTime.month,
          day: blogItemDate.dateTime.day,
          hour: blogItemDate.dateTime.hour,
          minute: blogItemDate.dateTime.minute,
          second: blogItemDate.dateTime.second,
        },
        { overflow: "reject" },
      );
    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unexpected type: ${blogItemDate.type}`);
  }
};

export const compareBlogItemDates = (
  a: BlogItemDate,
  b: BlogItemDate,
): number =>
  Temporal.PlainDateTime.compare(
    blogItemDateToPlainDateTime(a),
    blogItemDateToPlainDateTime(b),
  );

export const equalsBlogItemDates = (
  a: BlogItemDate,
  b: BlogItemDate,
): boolean => compareBlogItemDates(a, b) === 0;

export const dropTimeFromBlogItemDate = (
  dateTime: BlogItemDate,
): BlogItemDate => {
  switch (dateTime.type) {
    case "year":
    case "yearMonth":
    case "date":
      return dateTime;
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds":
      return {
        type: "date",
        date: dateTime.dateTime.toPlainDate(),
      };
    default:
      throw new Error(
        // @ts-expect-error This should never happen
        `Unexpected \`dateTime.type\`: ${dateTime.toString()}`,
      );
  }
};

/** The year at build time, in the same time zone as the content dates. */
export const getCurrentYear = (): number =>
  Temporal.Now.plainDateISO(DATETIME_INPUT_TZ).year;

// #region From other types

export const instantToBlogItemDate = (
  instant: Temporal.Instant,
): BlogItemDate => {
  const dateTime = instant
    .toZonedDateTimeISO(DATETIME_INPUT_TZ)
    .toPlainDateTime();

  return {
    type: "dateTimeWithSeconds",
    dateTime,
  };
};

// #region To machine strings

export const blogItemDateToTemporalInstant = (
  blogItemDate: BlogItemDate,
): Temporal.Instant =>
  blogItemDateToPlainDateTime(blogItemDate)
    .toZonedDateTime(DATETIME_INPUT_TZ)
    .toInstant();

/**
 * The date as an ISO 8601 UTC timestamp, e.g. `2026-10-31T07:54:00Z`.
 *
 * It ends in `Z`, not in a `[UTC]` time zone annotation, which most parsers don't understand.
 */
export const blogItemDateToUTCISO8601Z = (blogItemDate: BlogItemDate): string =>
  blogItemDateToTemporalInstant(blogItemDate).toString();

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time
 */
export const blogItemDateToHtmlDateTime = (
  blogItemDate: BlogItemDate,
): string => {
  switch (blogItemDate.type) {
    case "year":
      return blogItemDate.year.toString();
    case "yearMonth":
      return blogItemDate.yearMonth.toString();
    case "date":
      return blogItemDate.date.toString();
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds":
      return blogItemDateToUTCISO8601Z(blogItemDate);
    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unexpected type: ${blogItemDate.type}`);
  }
};

// #region To human strings

export const blogItemDateToShortString = (
  blogItemDate: BlogItemDate,
): string => {
  const dateString = blogItemDateToShortDateString(blogItemDate);
  const timeString = blogItemDateToShortTimeString(blogItemDate);

  return timeString === null ? dateString : `${dateString} ${timeString}`;
};

export const blogItemDateToShortDateString = (
  blogItemDate: BlogItemDate,
): string => {
  switch (blogItemDate.type) {
    case "year": {
      return blogItemDate.year.toString();
    }
    case "yearMonth": {
      const year = blogItemDate.yearMonth.year;
      const month = blogItemDate.yearMonth.month.toString().padStart(2, "0");
      return `${year}-${month}`;
    }
    case "date": {
      const year = blogItemDate.date.year;
      const month = blogItemDate.date.month.toString().padStart(2, "0");
      const day = blogItemDate.date.day.toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds": {
      const year = blogItemDate.dateTime.year;
      const month = blogItemDate.dateTime.month.toString().padStart(2, "0");
      const day = blogItemDate.dateTime.day.toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
};

export const blogItemDateToShortTimeString = (
  blogItemDate: BlogItemDate,
): string | null => {
  switch (blogItemDate.type) {
    case "year":
    case "yearMonth":
    case "date": {
      return null;
    }
    case "dateTimeNoSeconds":
    case "dateTimeWithSeconds": {
      const hour = blogItemDate.dateTime.hour.toString().padStart(2, "0");
      const minute = blogItemDate.dateTime.minute.toString().padStart(2, "0");
      return `${hour}:${minute}`;
    }
  }
};

/**
 * The Temporal types MDX files can export as dates.
 *
 * Both `ItemModuleDate` and `isItemModuleDate` come from this list, so the type and its runtime check can't
 * disagree.
 */
const ITEM_MODULE_TEMPORAL_DATES = [
  // Will imply "dateTimeWithSeconds" in `DATETIME_INPUT_TZ`
  Temporal.Instant,
  // Will imply "yearMonth"
  Temporal.PlainYearMonth,
  // Will imply "date"
  Temporal.PlainDate,
  // Will imply "dateTimeWithSeconds"
  Temporal.PlainDateTime,
] as const;

/**
 * Union of date types accepted as module exports in MDX files.
 * Shared between blog and timeline item-module parsers.
 */
export type ItemModuleDate =
  | InstanceType<(typeof ITEM_MODULE_TEMPORAL_DATES)[number]>
  // Our true value
  | BlogItemDate;

export const isItemModuleDate = (x: unknown): x is ItemModuleDate => {
  return (
    ITEM_MODULE_TEMPORAL_DATES.some(
      (TemporalDate) => x instanceof TemporalDate,
    ) || isBlogItemDate(x)
  );
};

export const itemModuleDateToBlogItemDate = (
  x: ItemModuleDate,
): BlogItemDate => {
  if (x instanceof Temporal.Instant) {
    return instantToBlogItemDate(x);
  }

  if (x instanceof Temporal.PlainYearMonth) {
    return {
      type: "yearMonth",
      yearMonth: x,
    };
  }

  if (x instanceof Temporal.PlainDate) {
    return {
      type: "date",
      date: x,
    };
  }

  if (x instanceof Temporal.PlainDateTime) {
    return {
      type: "dateTimeWithSeconds",
      dateTime: x,
    };
  }

  // Only `BlogItemDate` is left, so a type added to `ITEM_MODULE_TEMPORAL_DATES` but not handled above fails here.
  return x;
};

/**
 * An item's last modification date, for both blog and timeline items.
 *
 * The explicit date wins over the inferred one. Either only counts when it's after the publication date.
 *
 * An inferred date before publication is an edit made while writing the item, so it doesn't count. An explicit one
 * is a mistake, so it throws.
 *
 * @param explicit The module's `lastModificationDate` export, if any.
 * @param inferred The item's last modification date according to git, or `null` if there's none.
 * @param publicationDate The item's publication date.
 * @returns The last modification date, or `null` if the item wasn't modified after its publication.
 */
export const resolveLastModificationDate = (
  explicit: ItemModuleDate | undefined,
  inferred: ItemModuleDate | null,
  publicationDate: BlogItemDate,
): BlogItemDate | null => {
  if (explicit) {
    const explicitConverted = itemModuleDateToBlogItemDate(explicit);
    const comparison = compareBlogItemDates(explicitConverted, publicationDate);
    if (comparison < 0) {
      throw new Error(
        `The \`lastModificationDate\` (${blogItemDateToShortString(explicitConverted)}) is before the \`publicationDate\` (${blogItemDateToShortString(publicationDate)})`,
      );
    }

    return comparison > 0 ? explicitConverted : null;
  }

  if (inferred === null) {
    return null;
  }

  const inferredConverted = itemModuleDateToBlogItemDate(inferred);
  return compareBlogItemDates(inferredConverted, publicationDate) > 0
    ? inferredConverted
    : null;
};
