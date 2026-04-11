import type { Item } from "../../utils/analyze";
import type { BlogItemModuleParsed } from "../../blog/item-module";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";

type BlogArticleContentProps = {
  article: Item<BlogItemModuleParsed>;
};

export const BlogArticleContent: React.FC<BlogArticleContentProps> = ({
  article,
}) => {
  const {
    module: { Component },
  } = article;

  return (
    <section>
      <Component components={MDX_DEFAULT_COMPONENTS} />
    </section>
  );
};
