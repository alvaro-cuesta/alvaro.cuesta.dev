import cx from "classnames";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { BlogArticleTableOfContents } from "./BlogArticleTableOfContents";

export type TableOfContentsProps = {
  tableOfContents: Toc;
  id?: string | undefined;
  maxDepth?: number | undefined;
};

export const TableOfContents = ({
  tableOfContents,
  id,
  maxDepth,
}: TableOfContentsProps) => (
  <article className={cx("toc-section")}>
    {/* Make sure this matches `rehypeAutolinkHeadings` */}
    <h3 id={id} className="autolink-heading">
      Table of contents
      {id ? (
        <a className="autolink-link" aria-label="(permalink)" href={`#${id}`}>
          <span className="fas fa-link autolink-icon"></span>
        </a>
      ) : null}
    </h3>

    <BlogArticleTableOfContents
      tableOfContents={tableOfContents}
      depth={0}
      maxDepth={maxDepth}
    />
  </article>
);
