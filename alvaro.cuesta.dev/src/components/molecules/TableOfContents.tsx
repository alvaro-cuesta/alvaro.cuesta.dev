import cx from "classnames";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Link } from "../atoms/Link";

type TableOfContentsWrapperProps = {
  className: string;
  children: React.ReactNode;
};

export type TableOfContentsProps = {
  tableOfContents: Toc;
  id?: string | undefined;
  maxDepth?: number | undefined;
  Wrapper: React.ElementType<TableOfContentsWrapperProps>;
};

export const TableOfContents = ({
  tableOfContents,
  id,
  maxDepth,
  Wrapper = "article",
}: TableOfContentsProps) => (
  <Wrapper className={cx("toc-section")}>
    {/* Make sure this matches `rehypeAutolinkHeadings` */}
    <h3 id={id} className="autolink-heading">
      Table of contents
      {id ? (
        <a className="autolink-link" aria-label="(permalink)" href={`#${id}`}>
          <span className="fas fa-link autolink-icon"></span>
        </a>
      ) : null}
    </h3>

    <TableOfContentsInner
      tableOfContents={tableOfContents}
      depth={0}
      maxDepth={maxDepth}
    />
  </Wrapper>
);

type TableOfContentsInnerProps = {
  tableOfContents: Toc;
  depth: number;
  maxDepth?: number | undefined;
};

export const TableOfContentsInner: React.FC<TableOfContentsInnerProps> = ({
  tableOfContents,
  depth,
  maxDepth,
}) => (
  <>
    <ol type={OL_DEPTH_TO_TYPE[depth]}>
      {tableOfContents.map((tocItem) => (
        <li key={tocItem.id}>
          <Link href={`#${tocItem.id}`}>{tocItem.value}</Link>

          {tocItem.children !== undefined &&
          tocItem.children.length > 0 &&
          (maxDepth === undefined || depth + 1 < maxDepth) ? (
            <TableOfContentsInner
              tableOfContents={tocItem.children}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ) : null}
        </li>
      ))}
    </ol>
  </>
);

const OL_DEPTH_TO_TYPE = ["1", "a", "i", "1", "a", "i"] as const;
