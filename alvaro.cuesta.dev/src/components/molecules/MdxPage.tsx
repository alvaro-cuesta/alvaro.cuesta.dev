import type { MDXContent } from "mdx/types.js";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Template } from "../Template.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { makeTitle } from "../../utils/meta.ts";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx.tsx";
import { MdxRenderContext } from "../../mdx/MdxRenderContext.tsx";
import { contentFile } from "../../utils/content-file.ts";
import { instantToBlogItemDate } from "../../utils/item-dates.ts";
import { routeHome } from "../../routes.ts";
import { read } from "@xenon-ssg/thunks";
import {
  assertHasMdxDefaultExport,
  assertIsModule,
  assertOptionalString,
  assertRequiredArray,
} from "../../utils/item-module-assertions.ts";

type MdxPageModule = {
  default: MDXContent;
  title?: string | undefined;
  description?: string | undefined;
  /**
   * The page's `og:type`.
   *
   * `"website"` (the default) or `"article"`.
   */
  openGraphType?: string | undefined;
  tableOfContents: Toc;
};

function assertIsMdxPageModule(
  module: unknown,
  label: string,
): asserts module is MdxPageModule {
  assertIsModule(module, label);
  assertHasMdxDefaultExport(module, label);
  assertOptionalString(module, "title", label);
  assertOptionalString(module, "description", label);
  assertOptionalString(module, "openGraphType", label);
  assertRequiredArray(module, "tableOfContents", label);
}

type MdxPageProps = {
  siteRenderMeta: SiteRenderMeta;
};

export function makeMdxPage(contentFileUrl: string) {
  const page = contentFile(contentFileUrl);

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
    assertIsMdxPageModule(module, `MdxPage module at ${contentFileUrl}`);

    const {
      default: Content,
      title,
      description,
      openGraphType = "website",
      tableOfContents,
    } = module;

    if (title === undefined) {
      throw new Error(
        `MdxPage module at ${contentFileUrl} is missing required \`title\` export.`,
      );
    }
    if (description === undefined) {
      throw new Error(
        `MdxPage module at ${contentFileUrl} is missing required \`description\` export.`,
      );
    }
    if (openGraphType !== "website" && openGraphType !== "article") {
      throw new Error(
        `MdxPage module at ${contentFileUrl} has an unknown \`openGraphType\` export: ${openGraphType}.`,
      );
    }

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
