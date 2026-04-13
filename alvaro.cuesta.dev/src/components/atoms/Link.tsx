import {
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Link as XenonLink } from "xenon-ssg/src/generate/Link";
import { canonicalizeHref } from "xenon-ssg/src/url";
import { getDomain, parse } from "tldts";
import { Icon } from "./Icon";
import { getBlogItems } from "../../blog/promise";
import { getTimelineItems } from "../../timeline/promise";
import { rewriteCustomProtocolHref } from "../../utils/href";

export function extractText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

export function isLinkTextRedundant(
  children: ReactNode,
  href: string | undefined,
): boolean {
  if (!href) return false;

  const extracted = extractText(children);
  if (!extracted) return false;

  const text = extracted.trim().toLowerCase();
  const normalizedHref = href.toLowerCase();

  if (text === normalizedHref || text === normalizedHref.replace(/\/$/, "")) {
    return true;
  }

  const parsed = parse(href);
  if (!parsed.domain) return false;

  const normalizedText = text.replace(/^www\./, "");
  return (
    normalizedText === parsed.domain ||
    normalizedText === parsed.domainWithoutSuffix ||
    (parsed.hostname !== null &&
      normalizedText === parsed.hostname.replace(/^www\./, ""))
  );
}

type LinkProps = ComponentPropsWithoutRef<"a"> & {
  isExternal?: boolean;
  hideExternalIcon?: boolean;
  showDomain?: boolean | undefined;
  Component?: React.ElementType<ComponentPropsWithoutRef<"a">>;
};

export async function Link({
  isExternal,
  hideExternalIcon,
  showDomain,
  children,
  Component = XenonLink,
  ...props
}: LinkProps) {
  const [blogItems, timelineItems] = await Promise.all([
    getBlogItems(),
    getTimelineItems(),
  ]);

  const rewrittenHref = rewriteCustomProtocolHref(props.href, {
    blogItems,
    timelineItems,
  });

  const calculatedIsExternal =
    isExternal ??
    (rewrittenHref
      ? !rewrittenHref.startsWith("mailto:") &&
        !canonicalizeHref(rewrittenHref).isInternal
      : false);

  const isPlainLink = isLinkTextRedundant(children, rewrittenHref);

  const domain =
    showDomain && calculatedIsExternal && rewrittenHref && !isPlainLink
      ? getDomain(rewrittenHref)
      : null;

  return (
    <Component
      {...props}
      href={rewrittenHref}
      target={(props.target ?? calculatedIsExternal) ? "_blank" : undefined}
      rel={calculatedIsExternal ? "noopener noreferrer" : undefined}
    >
      {children}
      {domain ? (
        <small className="link-domain">
          {" "}
          ({domain}
          {calculatedIsExternal && !hideExternalIcon ? (
            <Icon
              name="external-link-alt"
              className="small-sup"
              aria-label=" opens in new tab"
            />
          ) : null}
          )
        </small>
      ) : calculatedIsExternal && !hideExternalIcon ? (
        <Icon
          name="external-link-alt"
          className="small-sup"
          aria-label=" (opens in new tab)"
        />
      ) : null}
    </Component>
  );
}
