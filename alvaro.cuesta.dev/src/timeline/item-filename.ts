import { Temporal } from "temporal-polyfill";
import type { BlogItemDate } from "../utils/item-dates";

const FILENAME_REGEX =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})_(?<hour>\d{2})-(?<minute>\d{2})\.mdx?$/;

export const parseTimelineItemFilename = (
  filename: string,
): {
  creationDate: BlogItemDate;
} => {
  const match = FILENAME_REGEX.exec(filename);

  if (!match) {
    throw new Error(
      `The timeline filename "${filename}" does not match the expected format "yyyy-mm-dd_hh-mm.mdx".`,
    );
  }

  const groups = match.groups!;

  const year = parseInt(groups["year"]!, 10);
  const month = parseInt(groups["month"]!, 10);
  const day = parseInt(groups["day"]!, 10);
  const hour = parseInt(groups["hour"]!, 10);
  const minute = parseInt(groups["minute"]!, 10);

  return {
    creationDate: {
      type: "dateTimeNoSeconds",
      dateTime: Temporal.PlainDateTime.from(
        { year, month, day, hour, minute },
        { overflow: "reject" },
      ),
    },
  };
};
