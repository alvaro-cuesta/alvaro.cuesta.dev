import type { MDXComponents } from "mdx/types.js";
import { Link } from "../components/atoms/Link.tsx";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { blog } from "../blog/promise.ts";
import { timeline } from "../timeline/promise.ts";
import { rewriteCustomProtocolHref } from "../utils/href.ts";
import { read } from "@xenon-ssg/thunks";

type MdxAnchorProps = ComponentPropsWithoutRef<"a">;

export type HashtagProps = {
  tag?: string | undefined;
  href?: string | undefined;
  children: React.ReactNode;
};

type MakeMdxDefaultComponentsOptions = {
  /**
   * When provided, the `a` component will rewrite custom protocol hrefs and
   * make them absolute with this. Used for feed rendering where `<a>` is used
   * instead of `<Link>`.
   *
   * When omitted, href rewriting is left to the `<Link>` component (the default
   * `renderAnchor`).
   */
  resolveHref?: ((href: string) => string) | undefined;
  showDomain?: boolean;
  renderAnchor?: (props: MdxAnchorProps) => ReactElement;
  renderHashtag?: (props: HashtagProps) => ReactElement;
};

export const makeMdxDefaultComponents = ({
  resolveHref,
  showDomain,
  renderAnchor = (props) => <Link showDomain={showDomain} {...props} />,
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
  a: resolveHref
    ? async function MdxAnchorCanonicalized(props) {
        const [blogItems, timelineItems] = await Promise.all([
          read(blog),
          read(timeline),
        ]);

        let href = rewriteCustomProtocolHref(props.href, {
          blogItems,
          timelineItems,
        });

        if (href) {
          href = resolveHref(href);
        }

        return renderAnchor({ ...props, href });
      }
    : function MdxAnchor(props) {
        return renderAnchor(props);
      },
  Hashtag: resolveHref
    ? async function MdxHashtagCanonicalized(props: HashtagProps) {
        const tagName =
          props.tag ??
          (typeof props.children === "string" ? props.children : undefined);

        if (!tagName) return renderHashtag(props);

        const [blogItems, timelineItems] = await Promise.all([
          read(blog),
          read(timeline),
        ]);

        let href: string | undefined = `timeline-tag:///${tagName}`;
        href = rewriteCustomProtocolHref(href, { blogItems, timelineItems });

        if (href) {
          href = resolveHref(href);
        }

        return renderHashtag({ ...props, href });
      }
    : function MdxHashtag(props: HashtagProps) {
        return renderHashtag(props);
      },
});

export const MDX_DEFAULT_COMPONENTS = makeMdxDefaultComponents();
