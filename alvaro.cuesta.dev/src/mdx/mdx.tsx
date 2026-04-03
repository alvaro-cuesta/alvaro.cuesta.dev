import type { MDXComponents } from "mdx/types";
import { Link } from "../components/atoms/Link";
import type { ComponentPropsWithoutRef, ReactElement } from "react";

type MdxAnchorProps = ComponentPropsWithoutRef<"a">;

type MakeMdxDefaultComponentsOptions = {
  rewriteHref?: (href: string | undefined) => string | undefined;
  renderAnchor?: (props: MdxAnchorProps) => ReactElement;
};

export const makeMdxDefaultComponents = ({
  rewriteHref,
  renderAnchor = (props) => <Link {...props} />,
}: MakeMdxDefaultComponentsOptions = {}): MDXComponents => ({
  a(props) {
    return renderAnchor({
      ...props,
      href: rewriteHref ? rewriteHref(props.href) : props.href,
    });
  },
});

export const MDX_DEFAULT_COMPONENTS = makeMdxDefaultComponents();
