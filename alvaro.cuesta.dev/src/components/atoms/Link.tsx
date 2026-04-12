import { type ComponentPropsWithoutRef } from "react";
import { Link as XenonLink } from "xenon-ssg/src/generate/Link";
import { canonicalizeHref } from "xenon-ssg/src/url";
import { getDomain } from "tldts";
import { Icon } from "./Icon";
import { useBlogItems } from "../../blog/promise";
import { useTimelineItems } from "../../timeline/promise";
import { rewriteCustomProtocolHref } from "../../utils/href";

type LinkProps = ComponentPropsWithoutRef<"a"> & {
  isExternal?: boolean;
  hideExternalIcon?: boolean;
  showDomain?: boolean | undefined;
  Component?: React.ElementType<ComponentPropsWithoutRef<"a">>;
};

export function Link({
  isExternal,
  hideExternalIcon,
  showDomain,
  children,
  Component = XenonLink,
  ...props
}: LinkProps) {
  const blogItems = useBlogItems();
  const timelineItems = useTimelineItems();

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

  const isPlainLink =
    typeof children === "string" &&
    rewrittenHref &&
    (children === rewrittenHref ||
      children === rewrittenHref.replace(/\/$/, ""));

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
