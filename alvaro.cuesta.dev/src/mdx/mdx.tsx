import type { MDXComponents } from "mdx/types";
import { Link } from "../components/atoms/Link";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { BlogDateTime } from "../components/atoms/BlogDateTime";
import { useBlogItems } from "../blog/promise";
import { useMicroblogItems } from "../microblog/promise";
import { rewriteCustomProtocolHref } from "../utils/href";
import { canonicalizeHref } from "xenon-ssg/src/url";

type MdxAnchorProps = ComponentPropsWithoutRef<"a">;

export type HashtagProps = {
  tag?: string | undefined;
  href?: string | undefined;
  children: React.ReactNode;
};

type MakeMdxDefaultComponentsOptions = {
  /**
   * When provided, the `a` component will rewrite custom protocol hrefs and
   * canonicalize relative URLs against this base. Used for feed rendering where
   * `<a>` is used instead of `<Link>`.
   *
   * When omitted, href rewriting is left to the `<Link>` component (the default
   * `renderAnchor`).
   */
  canonicalizeBaseUrl?: URL;
  showDomain?: boolean;
  renderAnchor?: (props: MdxAnchorProps) => ReactElement;
  renderHashtag?: (props: HashtagProps) => ReactElement;
};

export const makeMdxDefaultComponents = ({
  canonicalizeBaseUrl,
  showDomain,
  renderAnchor = (props) => <Link showDomain={showDomain} {...props} />,
  renderHashtag = ({ tag, children }) => {
    const tagName =
      tag ?? (typeof children === "string" ? children : undefined);

    return tagName ? (
      <Link href={`microblog-tag:///${tagName}`}>#{children}</Link>
    ) : (
      <>#{children}</>
    );
  },
}: MakeMdxDefaultComponentsOptions = {}): MDXComponents => ({
  a: canonicalizeBaseUrl
    ? function MdxAnchorCanonicalized(props) {
        const blogItems = useBlogItems();
        const microblogItems = useMicroblogItems();

        let href = rewriteCustomProtocolHref(props.href, {
          blogItems,
          microblogItems,
        });

        if (href) {
          href = canonicalizeHref(href, canonicalizeBaseUrl).pathUrl.toString();
        }

        return renderAnchor({ ...props, href });
      }
    : function MdxAnchor(props) {
        return renderAnchor(props);
      },
  Hashtag: canonicalizeBaseUrl
    ? function MdxHashtagCanonicalized(props: HashtagProps) {
        const tagName =
          props.tag ??
          (typeof props.children === "string" ? props.children : undefined);

        if (!tagName) return renderHashtag(props);

        const blogItems = useBlogItems();
        const microblogItems = useMicroblogItems();

        let href: string | undefined = `microblog-tag:///${tagName}`;
        href = rewriteCustomProtocolHref(href, { blogItems, microblogItems });

        if (href) {
          href = canonicalizeHref(href, canonicalizeBaseUrl).pathUrl.toString();
        }

        return renderHashtag({ ...props, href });
      }
    : function MdxHashtag(props: HashtagProps) {
        return renderHashtag(props);
      },
  BlogDateTime(props: ComponentPropsWithoutRef<typeof BlogDateTime>) {
    return <BlogDateTime {...props} />;
  },
});

export const MDX_DEFAULT_COMPONENTS = makeMdxDefaultComponents();
