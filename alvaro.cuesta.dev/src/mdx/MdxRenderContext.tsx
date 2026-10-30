import { createContext } from "react";

export type MdxRenderContextValue = {
  /**
   * Path of the page the MDX content is rendered for.
   */
  pathname: string;
  /**
   * Set when rendering for feeds, where links must be absolute (see
   * `makeMdxDefaultComponents`).
   */
  canonicalizeBaseUrl?: URL | undefined;
};

/**
 * Where MDX content is being rendered, for components imported from MDX files.
 * Unlike MDX default components, those don't receive per-render options.
 */
export const MdxRenderContext = createContext<MdxRenderContextValue | null>(
  null,
);
