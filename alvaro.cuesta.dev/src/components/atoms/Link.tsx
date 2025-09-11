import { type ComponentPropsWithoutRef } from "react";
import { Link as XenonLink } from "xenon-ssg/src/generate/Link";
import { canonicalizeHref } from "xenon-ssg/src/url";
import { Icon } from "./Icon";

type LinkProps = ComponentPropsWithoutRef<"a"> & {
  isExternal?: boolean;
  hideExternalIcon?: boolean;
};

export const Link: React.FC<LinkProps> = ({
  isExternal,
  hideExternalIcon,
  children,
  ...props
}) => {
  const calculatedIsExternal =
    isExternal ??
    (props.href ? !canonicalizeHref(props.href).isInternal : false);

  return (
    <XenonLink
      {...props}
      target={(props.target ?? calculatedIsExternal) ? "_blank" : undefined}
      rel={calculatedIsExternal ? "noopener noreferrer" : undefined}
    >
      {children}
      {calculatedIsExternal && !hideExternalIcon ? (
        <Icon
          name="external-link-alt"
          className="small-sup"
          aria-label=" (opens in new tab)"
        />
      ) : null}
    </XenonLink>
  );
};
