import type { MDXComponents } from "mdx/types";
import { Link } from "../components/atoms/Link";

export const MDX_DEFAULT_COMPONENTS: MDXComponents = {
  a(props) {
    return <Link {...props} />;
  },
};
