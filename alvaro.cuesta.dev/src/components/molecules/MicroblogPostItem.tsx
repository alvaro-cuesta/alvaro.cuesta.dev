import type { MicroblogItem } from "../../microblog/item";
import { microblogPostId } from "../../microblog/analyze";
import { BlogDateTime } from "../atoms/BlogDateTime";
import { Link } from "../atoms/Link";
import { makeMdxDefaultComponents } from "../../mdx/mdx";
import { routeMicroblogPost } from "../../routes";

const MICROBLOG_MDX_COMPONENTS = makeMdxDefaultComponents({
  showDomain: true,
});

type MicroblogPostItemProps = {
  item: MicroblogItem;
};

export const MicroblogPostItem: React.FC<MicroblogPostItemProps> = ({
  item: {
    filename,
    module: { Component, publicationDate, lastModificationDate, draft },
  },
}) => {
  const permalink = routeMicroblogPost.build({
    id: microblogPostId(filename),
  });

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
