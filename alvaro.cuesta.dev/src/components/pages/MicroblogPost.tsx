import { Template } from "../Template";
import { Icon } from "../atoms/Icon";
import { Link } from "../atoms/Link";
import { useMicroblogItems } from "../../microblog/promise";
import type { SiteRenderMeta } from "../../site";
import { routeMicroblogPost, routeMicroblogList } from "../../routes";
import { makeTitle } from "../../utils/meta";
import { MICROBLOG_BLURB_DESCRIPTION } from "../../../config";
import { blogItemDateToShortString } from "../../utils/item-dates";
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

  const { publicationDate, lastModificationDate } = item.module;
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
        socialDescription: `Microblog post from ${dateStr}`,
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
      >
        <h2>Timeline post <small>{blogItemDateToShortString(publicationDate)}</small></h2>

        <MicroblogPostItem item={item} />

        <section className="microblog-pagination">
          <div className="flex-space-between">
            {newerPostHref ? (
              <Link href={newerPostHref} className="pagination-link">
                <span className="no-underline"><Icon name="arrow-left" aria-hidden="true" />&nbsp;</span>Newer post
              </Link>
            ) : (
              <div />
            )}
            {olderPostHref ? (
              <Link href={olderPostHref} className="pagination-link">
                Older post<span className="no-underline">&nbsp;<Icon name="arrow-right" aria-hidden="true" /></span>
              </Link>
            ) : null}
          </div>
        </section>
      </MicroblogListsLayout>
    </Template>
  );
};
