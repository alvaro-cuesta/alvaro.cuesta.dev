import type { BlogItem } from "../../blog/item";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";
import { TableOfContents, type TableOfContentsProps } from "./TableOfContents";

type BlogArticleContentProps = {
  article: BlogItem;
  /**
   * Useful if you want to disable the default components that are site-specific, e.g. for rendering into an RSS feed.
   */
  disableDefaultComponents?: boolean;
};

const DEFAULT_TOC_PERMALINK_ID = "toc";

export const BlogArticleContent: React.FC<BlogArticleContentProps> = ({
  article: {
    module: { Component, tableOfContents },
  },
  disableDefaultComponents = false,
}) => (
  <section>
    <Component
      {...(!disableDefaultComponents
        ? {
            components: {
              ...MDX_DEFAULT_COMPONENTS,
              TableOfContents: (
                props: Omit<TableOfContentsProps, "tableOfContents">,
              ) => (
                <TableOfContents
                  id={DEFAULT_TOC_PERMALINK_ID}
                  tableOfContents={tableOfContents}
                  {...props}
                />
              ),
            },
          }
        : {})}
    />
  </section>
);
