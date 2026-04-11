import { useMicroblogItems } from "../../microblog/promise";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { Template } from "../Template";
import { Link } from "../atoms/Link";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogTag, routeMicroblogTagList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";

type MicroblogTagListProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const MicroblogTagList: React.FC<MicroblogTagListProps> = ({
  siteRenderMeta,
}) => {
  const microblogItems = useMicroblogItems();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", "All tags"]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription("tags"),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[{ name: "Tags", href: routeMicroblogTagList.build({}) }]}
        microblogItems={microblogItems}
        isTagListCurrent
      >
        <h2>Timeline tags</h2>

        <ul>
          {microblogItems.tagsAscendingAlphabetically.map(({ tag, items }) => (
            <li key={tag}>
              <Link href={routeMicroblogTag.build({ tag, page: null })}>{tag}</Link> (
              {items.length})
            </li>
          ))}
        </ul>
      </MicroblogListsLayout>
    </Template>
  );
};
