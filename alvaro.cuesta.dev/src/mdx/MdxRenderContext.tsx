import { createContext } from "react";
import type { Toc } from "@stefanprobst/rehype-extract-toc";

export type MdxRenderContextValue = {
  /**
   * Path of the MDX content's own page (e.g. a timeline post's permalink, even
   * when rendered in a list of posts).
   */
  pathname: string;
  /**
   * Set when rendering for feeds, where links must be absolute: the absolute
   * URL an href points to (see `makeMdxDefaultComponents`).
   */
  resolveHref?: ((href: string) => string) | undefined;
  /**
   * The MDX module's `tableOfContents` export, for `<TableOfContents>`.
   *
   * Left out where no table of contents should render (e.g. feeds).
   */
  tableOfContents?: Toc | undefined;
};

/**
 * Where MDX content is being rendered, for components imported from MDX files.
 * Unlike MDX default components, those don't receive per-render options.
 *
 * Every MDX render provides it.
 */
export const MdxRenderContext = createContext<MdxRenderContextValue | null>(
  null,
);
