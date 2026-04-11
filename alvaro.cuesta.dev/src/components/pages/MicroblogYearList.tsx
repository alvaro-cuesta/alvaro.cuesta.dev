import { useMicroblogItems } from "../../microblog/promise";
import { Template } from "../Template";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { Link } from "../atoms/Link";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogYear, routeMicroblogYearList } from "../../routes";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";
import { makeTitle } from "../../utils/meta";

type MicroblogYearListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const MicroblogYearList: React.FC<MicroblogYearListProps> = ({
  siteRenderMeta,
}) => {
  const microblogItems = useMicroblogItems();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", "All years"]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription("posts by year"),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          { name: "Years", href: routeMicroblogYearList.build({}) },
        ]}
        microblogItems={microblogItems}
        isYearListCurrent
      >
        <h2>Timeline years</h2>

        <ul>
          {microblogItems.yearsSortedDescending.map(({ year, data }) => (
            <li key={year}>
              <Link href={routeMicroblogYear.build({ year, page: null })}>{year}</Link> (
              {data.totalCount})
            </li>
          ))}
        </ul>
      </MicroblogListsLayout>
    </Template>
  );
};
