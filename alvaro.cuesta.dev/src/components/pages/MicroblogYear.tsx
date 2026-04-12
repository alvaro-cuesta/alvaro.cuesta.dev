import { useMicroblogItems } from "../../microblog/promise";
import { Template } from "../Template";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { MicroblogPostItem } from "../molecules/MicroblogPostItem";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogYear, routeMicroblogYearList } from "../../routes";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";
import { makeTitle } from "../../utils/meta";
import { Pagination } from "../atoms/Pagination";
import { paginateItems } from "../../utils/pagination";

type MicroblogYearProps = {
  siteRenderMeta: SiteRenderMeta;
  year: number;
  page: number | null;
};

export const MicroblogYear: React.FC<MicroblogYearProps> = ({
  siteRenderMeta,
  year,
  page: rawPage,
}) => {
  const microblogItems = useMicroblogItems();

  const yearInfo = microblogItems.byYear.get(year);
  if (yearInfo === undefined) {
    throw new Error(`Year ${year} not found`);
  }

  // Flatten all items in this year sorted by descending date
  const allItemsInYear = [...yearInfo.byMonth.entries()]
    .sort(([a], [b]) =>
      a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : b - a,
    )
    .flatMap(([, items]) => items);

  const page = rawPage ?? 1;
  const { itemsInPage, totalPages } = paginateItems(allItemsInYear, page);

  if (itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found for year ${year}`);
  }

  const prevPageLink =
    page > 1
      ? routeMicroblogYear.build({
          year,
          page: page - 1 === 1 ? null : page - 1,
        })
      : null;
  const nextPageLink =
    page < totalPages
      ? routeMicroblogYear.build({ year, page: page + 1 })
      : null;

  const canonicalPathname = routeMicroblogYear.build({
    year,
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle([
          "Timeline",
          `Year ${year}`,
          page > 1 && `Page ${page}`,
        ]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(`year ${year}`),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          { name: "Years", href: routeMicroblogYearList.build({}) },
          {
            name: year.toString(),
            href: routeMicroblogYear.build({ year, page: null }),
          },
          ...(page > 1 && totalPages > 1
            ? [
                {
                  name: `Page ${page} of ${totalPages}`,
                  href: canonicalPathname,
                },
              ]
            : []),
        ]}
        microblogItems={microblogItems}
        currentYear={year}
        isYearListCurrent
        feedUrls={siteRenderMeta.feedUrls}
      >
        <h2>
          Timeline year {year}
          {page > 1 ? ` (page ${page} of ${totalPages})` : ""}
        </h2>

        <div className="microblog-list">
          {itemsInPage.map((item) => (
            <MicroblogPostItem key={item.filename} item={item} />
          ))}

          <section className="microblog-pagination">
            <Pagination
              prevPageLink={prevPageLink}
              nextPageLink={nextPageLink}
            />
          </section>
        </div>
      </MicroblogListsLayout>
    </Template>
  );
};
