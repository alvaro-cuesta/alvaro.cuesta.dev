import React, { type JSX, type ReactNode } from "react";

type AddLink = (href: string) => void;

type LinkContextValue = {
  addLink: AddLink;
  basepath: string;
};

const LinkContext = React.createContext<LinkContextValue | null>(null);

export type LinkProviderProps = {
  /**
   * Function to add a link to the list of links that the renderer will follow.
   */
  addLink: AddLink;
  /**
   * Where the site is served (e.g. `/repo`, or `""` at the root of its origin),
   * which site paths are relative to (see `toServedHref`).
   */
  basepath: string;
  /**
   * The children to render.
   */
  children: ReactNode;
};

/**
 * Provider for the `Link` component.
 *
 * @private Not meant to be used by end users. Will be automatically added by the renderer.
 */
export function LinkProvider({
  addLink,
  basepath,
  children,
}: LinkProviderProps): JSX.Element {
  return <LinkContext value={{ addLink, basepath }}>{children}</LinkContext>;
}

const useLinkContext = (hookName: string): LinkContextValue => {
  const value = React.useContext(LinkContext);

  if (!value) {
    throw new Error(`\`${hookName}\` must be used within a \`<LinkProvider>\``);
  }

  return value;
};

/**
 * Hook to add a link to the list of links that the renderer will follow.
 *
 * @private Not meant to be used by end users. Will be automatically added by the renderer.
 */
export const useAddLink = (): AddLink => useLinkContext("useAddLink").addLink;

/**
 * Hook for the base path the page is served at, which site paths are relative
 * to (see `toServedHref`).
 *
 * `Link` already serves its `href` there. This is for every other URL a page
 * writes as a site path (e.g. an `<img>`'s `src`).
 */
export const useBasepath = (): string => useLinkContext("useBasepath").basepath;
