import { Temporal } from "temporal-polyfill";

const RFC822_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RFC822_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function instantToUtcIso8601(instant: Temporal.Instant): string {
  return instant.toString();
}

export function compareInstants(
  a: Temporal.Instant,
  b: Temporal.Instant,
): number {
  return Temporal.Instant.compare(a, b);
}

export function instantToRfc822(instant: Temporal.Instant): string {
  const dateTime = instant.toZonedDateTimeISO("UTC");
  const weekday = RFC822_WEEKDAYS[dateTime.dayOfWeek - 1];
  const month = RFC822_MONTHS[dateTime.month - 1];

  return `${weekday}, ${dateTime.day.toString().padStart(2, "0")} ${month} ${dateTime.year} ${dateTime.hour.toString().padStart(2, "0")}:${dateTime.minute.toString().padStart(2, "0")}:${dateTime.second.toString().padStart(2, "0")} GMT`;
}
