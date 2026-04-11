import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { MicroblogPostItem } from "../molecules/MicroblogPostItem";
import { Template } from "../Template";
import { useMicroblogItems } from "../../microblog/promise";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogTag, routeMicroblogTagList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";

type MicroblogTagProps = {
  siteRenderMeta: SiteRenderMeta;
  tag: string;
};

export const MicroblogTag: React.FC<MicroblogTagProps> = ({
  siteRenderMeta,
  tag,
}) => {
  const microblogItems = useMicroblogItems();

  const itemsInTag = microblogItems.byTag.get(tag);

  if (itemsInTag === undefined) {
    throw new Error(`Tag ${tag} not found`);
  }

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", `Tag "${tag}"`]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(`tag ${tag}`),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          { name: "Tags", href: routeMicroblogTagList.build({}) },
          { name: tag, href: routeMicroblogTag.build({ tag }) },
        ]}
        microblogItems={microblogItems}
        currentTags={[tag]}
        isTagListCurrent
      >
        <h2>Timeline tag "{tag}"</h2>

        {itemsInTag.map((item) => (
          <MicroblogPostItem key={item.filename} item={item} />
        ))}
      </MicroblogListsLayout>
    </Template>
  );
};
