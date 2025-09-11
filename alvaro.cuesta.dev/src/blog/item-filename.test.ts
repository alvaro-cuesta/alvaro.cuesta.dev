import { describe, test, expect } from "vitest";
import { Temporal } from "temporal-polyfill";
import { parseBlogItemFilename } from "./item-filename";

const MEANINGLESS_DATE_STRING = "2000-01-01-00-00-00";

const MEANINGLESS_DATE = {
  type: "dateTimeWithSeconds",
  dateTime: Temporal.PlainDateTime.from({
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  }),
};

describe("parseBlogItemFilename", () => {
  describe("date-slug separator", () => {
    describe("separator: -", () => {
      test("single", () => {
        const result = parseBlogItemFilename(
          `${MEANINGLESS_DATE_STRING}-test.mdx`,
        );

        expect(result).toEqual({
          possibleCreationDate: MEANINGLESS_DATE,
          possibleSlug: "test",
        });
      });

      test("multiple", () => {
        const result = parseBlogItemFilename(
          `${MEANINGLESS_DATE_STRING}----test.mdx`,
        );

        expect(result).toEqual({
          possibleCreationDate: MEANINGLESS_DATE,
          possibleSlug: "test",
        });
      });
    });

    describe("separator: _", () => {
      test("single", () => {
        const result = parseBlogItemFilename(
          `${MEANINGLESS_DATE_STRING}_test.mdx`,
        );

        expect(result).toEqual({
          possibleCreationDate: MEANINGLESS_DATE,
          possibleSlug: "test",
        });
      });

      test("multiple", () => {
        const result = parseBlogItemFilename(
          `${MEANINGLESS_DATE_STRING}____test.mdx`,
        );

        expect(result).toEqual({
          possibleCreationDate: MEANINGLESS_DATE,
          possibleSlug: "test",
        });
      });
    });

    test("can mix separator types", () => {
      const result = parseBlogItemFilename(
        `${MEANINGLESS_DATE_STRING}_---__test.mdx`,
      );

      expect(result).toEqual({
        possibleCreationDate: MEANINGLESS_DATE,
        possibleSlug: "test",
      });
    });
  });

  test("should parse a filename which specifies no date", () => {
    const result = parseBlogItemFilename("test.mdx");

    expect(result).toEqual({
      possibleCreationDate: null,
      possibleSlug: "test",
    });
  });

  test("should parse a filename which only specifies year", () => {
    const result = parseBlogItemFilename("2021-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "year",
        year: 2021,
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename which only specifies year and month", () => {
    const result = parseBlogItemFilename("2021-09-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "yearMonth",
        yearMonth: Temporal.PlainYearMonth.from({
          year: 2021,
          month: 9,
        }),
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename which only specifies year, month, and day", () => {
    const result = parseBlogItemFilename("2021-09-20-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "date",
        date: Temporal.PlainDate.from({
          year: 2021,
          month: 9,
          day: 20,
        }),
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename which only specifies year, month, day, and hour as if it has NO hour", () => {
    // I wanted to not accept hours without minute but that breaks the regex (it's too greedy and parses the time into
    // the slug) so as a middle-ground let's just accept it and treat it as if it had no hour.
    const result = parseBlogItemFilename("2021-09-20-12-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "date",
        date: Temporal.PlainDate.from({
          year: 2021,
          month: 9,
          day: 20,
        }),
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename which only specifies year, month, day, hour, and minute", () => {
    const result = parseBlogItemFilename("2021-09-20-12-00-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "dateTimeNoSeconds",
        dateTime: Temporal.PlainDateTime.from({
          year: 2021,
          month: 9,
          day: 20,
          hour: 12,
          minute: 0,
        }),
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename which specifies all date parts", () => {
    const result = parseBlogItemFilename("2021-09-20-12-00-00-test.mdx");

    expect(result).toEqual({
      possibleCreationDate: {
        type: "dateTimeWithSeconds",
        dateTime: Temporal.PlainDateTime.from({
          year: 2021,
          month: 9,
          day: 20,
          hour: 12,
          minute: 0,
          second: 0,
        }),
      },
      possibleSlug: "test",
    });
  });

  test("should parse a filename with a slug that contains spaces", () => {
    const result = parseBlogItemFilename(
      `${MEANINGLESS_DATE_STRING}-test    test.mdx`,
    );

    expect(result).toEqual({
      possibleCreationDate: MEANINGLESS_DATE,
      possibleSlug: "test-test",
    });
  });

  describe("failure cases", () => {
    describe("fails with invalid dates", () => {
      test("year", () => {
        expect(() =>
          parseBlogItemFilename(
            "20-09-20-12-00-00__this-is-a-test article.mdx",
          ),
        ).toThrow(
          new Error(
            'The filename "20-09-20-12-00-00__this-is-a-test article.mdx" does not match the expected format.',
          ),
        );
      });

      test("month", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-20-07-17-35-43__this-is-a-test article.mdx",
          ),
        ).toThrow(new RangeError("Invalid month: 20; must be between 1-12"));
      });

      test("day", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-07-32-17-35-43__this-is-a-test article.mdx",
          ),
        ).toThrow(new RangeError("Invalid day: 32; must be between 1-31"));
      });

      test("31 of February", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-02-31-17-35-43__this-is-a-test article.mdx",
          ),
        ).toThrow(new RangeError("Invalid day: 31; must be between 1-28"));
      });
    });

    describe("fails with invalid times", () => {
      test("hours", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-07-20-99-35-43__this-is-a-test article.mdx",
          ),
        ).toThrow(new RangeError("Invalid isoHour: 99; must be between 0-23"));
      });

      test("minutes", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-07-20-17-99-43__this-is-a-test article.mdx",
          ),
        ).toThrow(
          new RangeError("Invalid isoMinute: 99; must be between 0-59"),
        );
      });

      test("seconds", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-07-20-17-35-99__this-is-a-test article.mdx",
          ),
        ).toThrow(
          new RangeError("Invalid isoSecond: 99; must be between 0-59"),
        );
      });
    });

    describe("fails with invalid slug", () => {
      test("invalid character", () => {
        expect(() =>
          parseBlogItemFilename(
            "1999-07-20-17-35-43__this-is-a-test article!.mdx",
          ),
        ).toThrow(
          new Error(
            'The filename "1999-07-20-17-35-43__this-is-a-test article!.mdx" does not match the expected format.',
          ),
        );
      });

      test("empty", () => {
        expect(() =>
          parseBlogItemFilename("1999-07-20-17-35-43__.mdx"),
        ).toThrow(
          new Error(
            'The filename "1999-07-20-17-35-43__.mdx" does not match the expected format.',
          ),
        );
      });
    });
  });

  test("more complex examples", () => {
    expect(
      parseBlogItemFilename("1999-07-20-17-35-43__this-is-a-test article.mdx"),
    ).toEqual({
      possibleCreationDate: {
        type: "dateTimeWithSeconds",
        dateTime: Temporal.PlainDateTime.from({
          year: 1999,
          month: 7,
          day: 20,
          hour: 17,
          minute: 35,
          second: 43,
        }),
      },
      possibleSlug: "this-is-a-test-article",
    });
  });
});
