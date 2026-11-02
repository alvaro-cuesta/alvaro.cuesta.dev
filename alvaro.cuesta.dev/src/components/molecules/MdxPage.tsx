import type { JSX } from "react";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Template } from "../Template.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { makeTitle } from "../../utils/meta.ts";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx.tsx";
import { MdxRenderContext } from "../../mdx/MdxRenderContext.tsx";
import { contentFile } from "../../utils/content-file.ts";
import {
  instantToBlogItemDate,
  type BlogItemDate,
} from "../../utils/item-dates.ts";
import { routeHome } from "../../routes.ts";
import { read } from "@xenon-ssg/thunks";
import type { FileUrl } from "@xenon-ssg/import-url";

/**
 * What a page's content gets as `props`.
 *
 * A page types its `props` with it by importing it as `Props`, the name the MDX checker looks for, in a comment before
 * one of its `import`/`export` statements:
 * `/** @import { MdxPageContentProps as Props } from "#components/molecules/MdxPage" *\/`.
 *
 * @todo Drop "before one of its statements" once the checker keeps a comment after the last one too:
 * https://github.com/remcohaszing/mdx-content-mapper/issues/3
 */
export type MdxPageContentProps = {
  /** When the page was last updated, as git says. */
  lastModified: BlogItemDate;
};

/** What a page's module exports, as its own types say (see `makeMdxPage`). */
export type MdxPageModule = {
  /** The content, which must take no props but these. */
  default: (
    props: MdxPageContentProps & { components: typeof MDX_DEFAULT_COMPONENTS },
  ) => JSX.Element;
  title: string;
  description: string;
  /**
   * The page's `og:type`.
   *
   * `"website"` (the default) or `"article"`.
   */
  openGraphType?: "website" | "article";
};

// A rehype plugin exports it from every page, and the MDX checker doesn't run
// them: so it's declared, unchecked, as a module augmentation would declare it.
//
// @todo Type it from the page. A `declare module "*.mdx"` can't add it, as the
// checked file wins over a pattern: it takes the MDX checker knowing the plugin
// (https://github.com/remcohaszing/mdx-content-mapper/issues/4), or TypeScript
// letting a wildcard augmentation add to the files it matches
// (https://github.com/microsoft/TypeScript/issues/65118).
type WithTableOfContents = { tableOfContents: Toc };

type MdxPageProps = {
  siteRenderMeta: SiteRenderMeta;
};

/**
 * A page made from an MDX file.
 *
 * Its module's exports are checked by their types, from the file itself (see `MdxPageModule`), except the table of
 * contents, which a plugin adds to every page and is taken on trust (see `WithTableOfContents`).
 *
 * @param file The page's file.
 * @returns The page, and when it was last updated.
 */
export function makeMdxPage<Module extends MdxPageModule>(
  file: FileUrl<Module>,
) {
  const page = contentFile(file);

  // A page that was never edited was last updated when it was created. No git history means it isn't committed yet,
  // i.e. it's being written right now.
  const getLastUpdated = async (): Promise<Temporal.Instant> => {
    const { gitDates } = await read(page);
    return (
      gitDates?.lastModifiedAt ?? gitDates?.createdAt ?? Temporal.Now.instant()
    );
  };

  async function MdxPage({ siteRenderMeta }: MdxPageProps) {
    const { module } = await read(page);

    const {
      default: Content,
      title,
      description,
      openGraphType = "website",
      tableOfContents,
    } =
      // Sound while `mdxCompiler.mts` runs both table of contents plugins: the
      // first always makes one (`[]` if no headings), the second exports it.
      module as typeof module & WithTableOfContents;

    const lastUpdated = instantToBlogItemDate(await getLastUpdated());

    return (
      <Template
        siteRenderMeta={siteRenderMeta}
        metaTags={{
          title: makeTitle([title]),
          description,
          socialTitle: title,
          socialDescription: description,
          openGraph:
            openGraphType === "article"
              ? {
                  type: "article",
                  authorProfileUrl: `${siteRenderMeta.baseUrl}${routeHome.build({})}`,
                }
              : { type: "website" },
        }}
      >
        <h2>{title}</h2>
        <section>
          <MdxRenderContext
            value={{
              pathname: siteRenderMeta.pathname,
              tableOfContents,
            }}
          >
            <Content
              components={MDX_DEFAULT_COMPONENTS}
              lastModified={lastUpdated}
            />
          </MdxRenderContext>
        </section>
      </Template>
    );
  }

  return { Component: MdxPage, getLastUpdated };
}
