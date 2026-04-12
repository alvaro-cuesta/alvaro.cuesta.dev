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
import { Pagination } from "../atoms/Pagination";
import { paginateItems } from "../../utils/pagination";

type MicroblogTagProps = {
  siteRenderMeta: SiteRenderMeta;
  tag: string;
  page: number | null;
};

export const MicroblogTag: React.FC<MicroblogTagProps> = ({
  siteRenderMeta,
  tag,
  page: rawPage,
}) => {
  const microblogItems = useMicroblogItems();

  const allItemsInTag = microblogItems.byTag.get(tag);

  if (allItemsInTag === undefined) {
    throw new Error(`Tag ${tag} not found`);
  }

  const page = rawPage ?? 1;
  const { itemsInPage, totalPages } = paginateItems(allItemsInTag, page);

  if (itemsInPage.length === 0) {
    throw new Error(`Page ${page} not found for tag ${tag}`);
  }

  const prevPageLink =
    page > 1
      ? routeMicroblogTag.build({ tag, page: page - 1 === 1 ? null : page - 1 })
      : null;
  const nextPageLink =
    page < totalPages ? routeMicroblogTag.build({ tag, page: page + 1 }) : null;

  const canonicalPathname = routeMicroblogTag.build({
    tag,
    page: page === 1 ? null : page,
  });

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      canonicalPathname={canonicalPathname}
      metaTags={{
        title: makeTitle([
          "Timeline",
          `Tag "${tag}"`,
          page > 1 && `Page ${page}`,
        ]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(`tag ${tag}`),
        openGraph: { type: "website" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          { name: "Tags", href: routeMicroblogTagList.build({}) },
          { name: tag, href: routeMicroblogTag.build({ tag, page: null }) },
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
        currentTags={[tag]}
        isTagListCurrent
        feedUrls={siteRenderMeta.feedUrls}
      >
        <h2>
          Timeline tag "{tag}"
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
