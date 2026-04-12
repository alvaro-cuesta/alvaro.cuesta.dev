import type { MDXComponents } from "mdx/types";
import { Link } from "../components/atoms/Link";
import { use, type ComponentPropsWithoutRef, type ReactElement } from "react";
import { BlogDateTime } from "../components/atoms/BlogDateTime";
import {
  TableOfContents,
  type TableOfContentsProps,
} from "../components/molecules/TableOfContents";
import { getBlogItems } from "../blog/promise";
import { useTimelineItems } from "../timeline/promise";
import { rewriteCustomProtocolHref } from "../utils/href";
import { canonicalizeHref } from "xenon-ssg/src/url";

type MdxAnchorProps = ComponentPropsWithoutRef<"a">;

export type HashtagProps = {
  tag?: string | undefined;
  href?: string | undefined;
  children: React.ReactNode;
};

const DEFAULT_TOC_PERMALINK_ID = "toc";

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
  /**
   * When true, the `TableOfContents` MDX component renders nothing.
   * The TOC data is auto-injected by the `recmaInjectTocProp` plugin.
   */
  suppressTableOfContents?: boolean;
};

export const makeMdxDefaultComponents = ({
  canonicalizeBaseUrl,
  showDomain,
  renderAnchor = (props) => <Link showDomain={showDomain} {...props} />,
  suppressTableOfContents = false,
  renderHashtag = ({ tag, children }) => {
    const tagName =
      tag ?? (typeof children === "string" ? children : undefined);

    return tagName ? (
      <Link href={`timeline-tag:///${tagName}`}>#{children}</Link>
    ) : (
      <>#{children}</>
    );
  },
}: MakeMdxDefaultComponentsOptions = {}): MDXComponents => ({
  a: canonicalizeBaseUrl
    ? function MdxAnchorCanonicalized(props) {
        const blogItems = use(getBlogItems());
        const timelineItems = useTimelineItems();

        let href = rewriteCustomProtocolHref(props.href, {
          blogItems,
          timelineItems,
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

        const blogItems = use(getBlogItems());
        const timelineItems = useTimelineItems();

        let href: string | undefined = `timeline-tag:///${tagName}`;
        href = rewriteCustomProtocolHref(href, { blogItems, timelineItems });

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
  TableOfContents: suppressTableOfContents
    ? () => null
    : (props: TableOfContentsProps) => (
        <TableOfContents id={DEFAULT_TOC_PERMALINK_ID} {...props} />
      ),
});

export const MDX_DEFAULT_COMPONENTS = makeMdxDefaultComponents();
