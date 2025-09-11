import { Temporal } from "temporal-polyfill";
import { DATETIME_INPUT_TZ } from "../../config";

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

const blogItemDateToPlainDateTime = (
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

// #region From other types

export const dateToBlogItemDate = (date: Date): BlogItemDate => {
  const dateTime = Temporal.ZonedDateTime.from(
    {
      timeZone: DATETIME_INPUT_TZ,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    },
    { overflow: "reject" },
  ).toPlainDateTime();

  return {
    type: "dateTimeWithSeconds",
    dateTime,
  };
};

// #region To machine strings

export const blogItemDateToISO8601 = (blogItemDate: BlogItemDate): string =>
  blogItemDateToPlainDateTime(blogItemDate)
    .toZonedDateTime(DATETIME_INPUT_TZ)
    .toString();

export const blogItemDateToUTCISO8601 = (blogItemDate: BlogItemDate): string =>
  blogItemDateToPlainDateTime(blogItemDate)
    .toZonedDateTime(DATETIME_INPUT_TZ)
    .withTimeZone("UTC")
    .toString();

export const blogItemDateToUTCISO8601Z = (blogItemDate: BlogItemDate): string =>
  blogItemDateToUTCISO8601(blogItemDate)
    // I'm not sure if most machines would understand the '[UTC]' thingie even if it's ISO8601 so let's replace it
    .replace("[UTC]", "Z");

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
      return blogItemDateToISO8601(blogItemDate);
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
