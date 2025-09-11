import {
  blogItemDateToHtmlDateTime,
  blogItemDateToShortString,
  dropTimeFromBlogItemDate,
  type BlogItemDate,
} from "../../blog/item-dates";

type BlogDateTimeProps = {
  dateTime: BlogItemDate;
  dropTime?: boolean;
};

export const BlogDateTime: React.FC<BlogDateTimeProps> = ({
  dateTime: dateTimeRaw,
  dropTime = false,
}) => {
  const dateTime = dropTime
    ? dropTimeFromBlogItemDate(dateTimeRaw)
    : dateTimeRaw;

  return (
    <time dateTime={blogItemDateToHtmlDateTime(dateTime)}>
      {blogItemDateToShortString(dateTime)}
    </time>
  );
};
