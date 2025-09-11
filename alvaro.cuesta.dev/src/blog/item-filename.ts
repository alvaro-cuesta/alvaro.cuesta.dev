import { Temporal } from "temporal-polyfill";
import type { BlogItemDate, BlogItemMonth } from "./item-dates";

const FILENAME_REGEX = new RegExp(
  [
    "^",
    "(?:",
    "  (?<year>\\d{4})",
    "    (?:-(?<month>\\d{2})",
    "      (?:-(?<day>\\d{2})",
    "        (?:[-_ ]+(?<hour>\\d{2})",
    "          (?:-(?<minute>\\d{2})",
    "            (?:-(?<second>\\d{2})",
    "            )?",
    "          )?",
    "        )?",
    "      )?",
    "    )?",
    "  [-_ ]+",
    ")?",
    "(?<slug>[a-zA-Z0-9\\- ]+)", // Here we also accept " " unlike other slug regexes because it will be replaced
    ".mdx?",
    "$",
  ]
    .map((x) => x.trim())
    .join(""),
);

export const parseBlogItemFilename = (
  filename: string,
): {
  possibleCreationDate: BlogItemDate | null;
  possibleSlug: string;
} => {
  const match = FILENAME_REGEX.exec(filename);

  if (!match) {
    throw new Error(
      `The filename "${filename}" does not match the expected format.`,
    );
  }

  const groups = match.groups!;

  const year =
    groups["year"] === undefined ? null : parseInt(groups["year"], 10);
  const month =
    groups["month"] === undefined
      ? null
      : (parseInt(groups["month"], 10) as BlogItemMonth); // `as BlogPostMonth` is fine because the regex guarantees that the month is in the range [1, 12]
  const day = groups["day"] === undefined ? null : parseInt(groups["day"], 10);
  const hour =
    groups["hour"] === undefined ? null : parseInt(groups["hour"], 10);
  const minute =
    groups["minute"] === undefined ? null : parseInt(groups["minute"], 10);
  const second =
    groups["second"] === undefined ? null : parseInt(groups["second"], 10);

  const possibleCreationDate: BlogItemDate | null =
    year === null
      ? null
      : month === null
        ? {
            type: "year",
            year,
          }
        : day === null
          ? {
              type: "yearMonth",
              yearMonth: Temporal.PlainYearMonth.from(
                { year, month },
                { overflow: "reject" },
              ),
            }
          : hour === null || minute === null
            ? {
                type: "date",
                date: Temporal.PlainDate.from(
                  { year, month, day },
                  { overflow: "reject" },
                ),
              }
            : second === null
              ? {
                  type: "dateTimeNoSeconds",
                  dateTime: Temporal.PlainDateTime.from(
                    { year, month, day, hour, minute },
                    { overflow: "reject" },
                  ),
                }
              : {
                  type: "dateTimeWithSeconds",
                  dateTime: Temporal.PlainDateTime.from(
                    { year, month, day, hour, minute, second },
                    { overflow: "reject" },
                  ),
                };

  const possibleSlug = groups["slug"]! // `!` is fine because the group is non-optional
    .replaceAll(/\s+/g, "-");

  return { possibleCreationDate, possibleSlug };
};
