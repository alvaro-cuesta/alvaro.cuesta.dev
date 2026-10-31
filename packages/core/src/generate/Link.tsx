import React, { type ComponentPropsWithoutRef } from "react";
import { useAddLink } from "./LinkContext.tsx";

type LinkProps = ComponentPropsWithoutRef<"a">;

/**
 * A `Link` that will be tracked by the renderer.
 *
 * This is just a very thin wrapper around an `<a>` element that will track the `href` attribute and add it to the list
 * of links that the renderer will follow.
 */
export const Link: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<LinkProps> & React.RefAttributes<HTMLAnchorElement>
> = React.forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const addLink = useAddLink();

  if (props.href !== undefined) {
    addLink(props.href);
  }

  return <a ref={ref} {...props} />;
});
