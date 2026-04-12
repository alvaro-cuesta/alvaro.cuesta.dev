import type { Item } from "../../../../utils/analyze";
import type { TimelineItemModuleParsed } from "../../../../timeline/item-module";
import { BlogDateTime } from "../../../atoms/BlogDateTime";
import { Link } from "../../../atoms/Link";
import { makeMdxDefaultComponents } from "../../../../mdx/mdx";
import { routeTimelinePost } from "../../../../routes";

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
