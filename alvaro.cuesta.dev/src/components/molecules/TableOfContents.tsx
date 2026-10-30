import { use } from "react";
import cx from "classnames";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Link } from "../atoms/Link.tsx";
import { MdxRenderContext } from "../../mdx/MdxRenderContext.tsx";

const DEFAULT_PERMALINK_ID = "toc";

type TableOfContentsWrapperProps = {
  className: string;
  children: React.ReactNode;
};

export type TableOfContentsProps = {
  id?: string | undefined;
  maxDepth?: number | undefined;
  Wrapper?: React.ElementType<TableOfContentsWrapperProps>;
};

/**
 * Table of contents of the MDX content it's rendered in, taken from
 * `MdxRenderContext`. Renders nothing where there is none (e.g. in feeds).
 *
 * Meant to be imported from MDX:
 *
 * ```mdx
 * import { TableOfContents } from "#components/molecules/TableOfContents";
 *
 * <TableOfContents maxDepth={1} />
 * ```
 */
export function TableOfContents({
  id = DEFAULT_PERMALINK_ID,
  maxDepth,
  Wrapper = "aside",
}: TableOfContentsProps) {
  const renderContext = use(MdxRenderContext);

  if (!renderContext) {
    throw new Error("`<TableOfContents>` must be rendered inside MDX content");
  }

  const { tableOfContents } = renderContext;

  if (tableOfContents === undefined) {
    return null;
  }

  return (
    <Wrapper className={cx("card", "toc-section")}>
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
}

type TableOfContentsInnerProps = {
  tableOfContents: Toc;
  depth: number;
  maxDepth?: number | undefined;
};

export function TableOfContentsInner({
  tableOfContents,
  depth,
  maxDepth,
}: TableOfContentsInnerProps) {
  return (
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
}

const OL_DEPTH_TO_TYPE = ["1", "a", "i", "1", "a", "i"] as const;
