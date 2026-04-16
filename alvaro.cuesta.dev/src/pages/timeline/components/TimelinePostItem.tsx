import type { Item } from "../../../utils/analyze.ts";
import type { TimelineItemModuleParsed } from "../../../timeline/item-module.ts";
import { BlogDateTime } from "../../../components/atoms/BlogDateTime.tsx";
import { Link } from "../../../components/atoms/Link.tsx";
import { makeMdxDefaultComponents } from "../../../mdx/mdx.tsx";
import { routeTimelinePost } from "../../../routes.ts";

const TIMELINE_MDX_COMPONENTS = makeMdxDefaultComponents({
  showDomain: true,
});

type TimelinePostItemProps = {
  item: Item<TimelineItemModuleParsed>;
};

export function TimelinePostItem({
  item: {
    module: { Component, slug, publicationDate, lastModificationDate, draft },
  },
}: TimelinePostItemProps) {
  const permalink = routeTimelinePost.build({ slug });

  return (
    <article className="timeline-post-item">
      <Component components={TIMELINE_MDX_COMPONENTS} />
      <footer className="flex-space-between">
        <small>
          <Link href={permalink}>
            <BlogDateTime dateTime={publicationDate} />
          </Link>
          {draft ? " (draft)" : ""}
        </small>
        {lastModificationDate ? (
          <small className="muted">
            <i>
              (edited <BlogDateTime dateTime={lastModificationDate} />)
            </i>
          </small>
        ) : null}
      </footer>
    </article>
  );
}
