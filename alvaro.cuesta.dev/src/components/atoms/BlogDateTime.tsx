import {
  blogItemDateToHtmlDateTime,
  blogItemDateToShortString,
  dropTimeFromBlogItemDate,
  type BlogItemDate,
} from "../../utils/item-dates";

type BlogDateTimeProps = {
  dateTime: BlogItemDate;
  dropTime?: boolean;
};

export function BlogDateTime({
  dateTime: dateTimeRaw,
  dropTime = false,
}: BlogDateTimeProps) {
  const dateTime = dropTime
    ? dropTimeFromBlogItemDate(dateTimeRaw)
    : dateTimeRaw;

  return (
    <time dateTime={blogItemDateToHtmlDateTime(dateTime)}>
      {blogItemDateToShortString(dateTime)}
    </time>
  );
}
