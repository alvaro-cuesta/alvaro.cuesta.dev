import React, { type ComponentPropsWithoutRef } from "react";
import { useAddLink, useBasepath } from "./LinkContext.tsx";
import { toServedHref } from "../url.ts";

export { useBasepath };

type LinkProps = ComponentPropsWithoutRef<"a">;

/**
 * A `Link` that will be tracked by the renderer.
 *
 * This is just a very thin wrapper around an `<a>` element that will track the `href` attribute and add it to the list
 * of links that the renderer will follow.
 *
 * Its `href` is a site path (e.g. `/blog/`) or any other href. It's written where it points to once served at the base
 * path (see `toServedHref`), so the same page works wherever the site is served.
 */
export const Link: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<LinkProps> & React.RefAttributes<HTMLAnchorElement>
> = React.forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const addLink = useAddLink();
  const basepath = useBasepath();

  if (props.href === undefined) {
    return <a ref={ref} {...props} />;
  }

  // The crawler follows site paths: they're what pages are rendered for.
  addLink(props.href);

  return <a ref={ref} {...props} href={toServedHref(props.href, basepath)} />;
});
