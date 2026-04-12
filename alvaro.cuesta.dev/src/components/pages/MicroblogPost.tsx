import { Template } from "../Template";
import { Pagination } from "../atoms/Pagination";
import { useMicroblogItems } from "../../microblog/promise";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogPost, routeMicroblogList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import {
  MICROBLOG_BLURB_DESCRIPTION,
  makeMicroblogBlurbSocialDescription,
} from "../../../config";
import {
  blogItemDateToShortString,
  getBlogItemDateYear,
} from "../../utils/item-dates";
import { MicroblogListsLayout } from "../molecules/MicroblogListsLayout";
import { MicroblogPostItem } from "../molecules/MicroblogPostItem";

type MicroblogPostPageProps = {
  siteRenderMeta: SiteRenderMeta;
  slug: string;
};

export const MicroblogPostPage: React.FC<MicroblogPostPageProps> = ({
  siteRenderMeta,
  slug,
}) => {
  const microblogItems = useMicroblogItems();

  const item = microblogItems.bySlug.get(slug);

  if (item === undefined) {
    throw new Error(`Microblog post "${slug}" not found`);
  }

  const { publicationDate, lastModificationDate, tags } = item.module;
  const dateStr = blogItemDateToShortString(publicationDate);

  const page = microblogItems.pageBySlug.get(slug) ?? 1;

  const sortedIndex = microblogItems.allSortedByDescendingDate.indexOf(item);
  const newerPost = microblogItems.allSortedByDescendingDate[sortedIndex - 1];
  const olderPost = microblogItems.allSortedByDescendingDate[sortedIndex + 1];

  const newerPostHref = newerPost
    ? routeMicroblogPost.build({ slug: newerPost.module.slug })
    : null;
  const olderPostHref = olderPost
    ? routeMicroblogPost.build({ slug: olderPost.module.slug })
    : null;

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title: makeTitle(["Timeline", dateStr]),
        description: MICROBLOG_BLURB_DESCRIPTION,
        socialTitle: makeTitle(["Timeline"]),
        socialDescription: makeMicroblogBlurbSocialDescription(dateStr),
        publishedTime: publicationDate,
        modifiedTime: lastModificationDate ?? undefined,
        openGraph: { type: "article" },
      }}
    >
      <MicroblogListsLayout
        breadcrumbs={[
          ...(page > 1
            ? [
                {
                  name: `Page ${page}`,
                  href: routeMicroblogList.build({ page }),
                },
              ]
            : []),
          { name: dateStr, href: siteRenderMeta.pathname },
        ]}
        microblogItems={microblogItems}
        currentTags={tags}
        currentYear={getBlogItemDateYear(publicationDate)}
        isTagListCurrent={tags.length > 0}
        isYearListCurrent
        feedUrls={siteRenderMeta.feedUrls}
      >
        <h2>
          Timeline post{" "}
          <small>{blogItemDateToShortString(publicationDate)}</small>
        </h2>

        <MicroblogPostItem item={item} />

        <section className="microblog-pagination">
          <Pagination
            prevPageLink={newerPostHref}
            nextPageLink={olderPostHref}
            prevLabel="Newer post"
            nextLabel="Older post"
          />
        </section>
      </MicroblogListsLayout>
    </Template>
  );
};
