declare module "*.mdx" {
  import React from "react";
  import type { MDXComponents } from "mdx/types";

  type MDXComponentProps = {
    components?: MDXComponents;
    [k: string]: unknown;
  };

  let MDXComponent: (props: MDXComponentProps) => React.JSX.Element;
  export default MDXComponent;

  export const title: string | undefined;
  export const description: string | undefined;
}
