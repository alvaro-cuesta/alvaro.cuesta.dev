import type { Item } from "../../../../utils/analyze";
import type { MicroblogItemModuleParsed } from "../../../../microblog/item-module";
import { BlogDateTime } from "../../../atoms/BlogDateTime";
import { Link } from "../../../atoms/Link";
import { makeMdxDefaultComponents } from "../../../../mdx/mdx";
import { routeMicroblogPost } from "../../../../routes";

const MICROBLOG_MDX_COMPONENTS = makeMdxDefaultComponents({
  showDomain: true,
});

type MicroblogPostItemProps = {
  item: Item<MicroblogItemModuleParsed>;
};

export const MicroblogPostItem: React.FC<MicroblogPostItemProps> = ({
  item: {
    module: { Component, slug, publicationDate, lastModificationDate, draft },
  },
}) => {
  const permalink = routeMicroblogPost.build({ slug });

  return (
    <article className="microblog-post-item">
      <Component components={MICROBLOG_MDX_COMPONENTS} />
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
};
