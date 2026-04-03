import type { BlogItem } from "../../blog/item";
import { rewriteBlogMdxHref } from "../../blog/href";
import { useBlogItems } from "../../blog/promise";
import { makeMdxDefaultComponents } from "../../mdx/mdx";
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
  article,
  disableDefaultComponents = false,
}) => {
  const blogItems = useBlogItems();
  const {
    filename,
    module: { Component, tableOfContents },
  } = article;

  return (
    <section>
      <Component
        {...(!disableDefaultComponents
          ? {
              components: {
                ...makeMdxDefaultComponents({
                  rewriteHref: (href) =>
                    rewriteBlogMdxHref(href, {
                      currentFilename: filename,
                      blogItems: blogItems.all,
                    }),
                }),
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
};
