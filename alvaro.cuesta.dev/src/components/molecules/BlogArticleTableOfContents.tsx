import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Link } from "../atoms/Link";

type BlogArticleTableOfContentsProps = {
  tableOfContents: Toc;
  depth: number;
};

export const BlogArticleTableOfContents: React.FC<
  BlogArticleTableOfContentsProps
> = ({ tableOfContents, depth }) => (
  <>
    <ol type={OL_DEPTH_TO_TYPE[depth]}>
      {tableOfContents.map((tocItem) => (
        <li key={tocItem.id}>
          <Link href={`#${tocItem.id}`}>{tocItem.value}</Link>

          {tocItem.children !== undefined && tocItem.children.length > 0 ? (
            <BlogArticleTableOfContents
              tableOfContents={tocItem.children}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ol>
  </>
);

const OL_DEPTH_TO_TYPE = ["1", "a", "i", "1", "a", "i"] as const;
