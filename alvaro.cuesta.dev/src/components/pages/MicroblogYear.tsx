import { useMicroblogItems } from "../../microblog/promise";
import { Template } from "../Template";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { MicroblogPostItem } from "../molecules/MicroblogPostItem";
import { type BlogItemMonth } from "../../utils/item-dates";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogYear, routeMicroblogYearList } from "../../routes";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";
import { makeTitle } from "../../utils/meta";

type MicroblogYearProps = {
  siteRenderMeta: SiteRenderMeta;
  year: number;
};

const MONTH_NUMBER_TO_NAME: {
  [Month in Exclude<BlogItemMonth, null>]: string;
} = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const NULL_MONTH_TO_NAME = "Other";

export const MicroblogYear: React.FC<MicroblogYearProps> = ({
  siteRenderMeta,
  year,
}) => {
  const microblogItems = useMicroblogItems();

  const yearInfo = microblogItems.byYear.get(year);
  if (yearInfo === undefined) {
    throw new Error(`Year ${year} not found`);
  }

  const monthsSortedByDescending = [...yearInfo.byMonth.entries()]
    .map(([month, items]) => ({ month, items }))
    .sort((a, b) =>
      a.month === null && b.month === null
        ? 0
        : a.month === null
          ? 1
          : b.month === null
            ? -1
            : b.month - a.month,
    );

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", `Year ${year}`]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(`year ${year}`),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          { name: "Years", href: routeMicroblogYearList.build({}) },
          { name: year.toString(), href: routeMicroblogYear.build({ year }) },
        ]}
        microblogItems={microblogItems}
        currentYear={year}
        isYearListCurrent
      >
        <h2>Timeline year {year}</h2>

        {monthsSortedByDescending.map(({ month, items }) => {
          const monthName =
            month !== null ? MONTH_NUMBER_TO_NAME[month] : NULL_MONTH_TO_NAME;

          return (
            <section key={month}>
              <h3>{monthName}</h3>
              {items.map((item) => (
                <MicroblogPostItem key={item.filename} item={item} />
              ))}
            </section>
          );
        })}
      </MicroblogListsLayout>
    </Template>
  );
};
