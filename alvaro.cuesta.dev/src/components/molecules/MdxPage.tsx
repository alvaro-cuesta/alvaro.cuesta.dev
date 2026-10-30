import url from "node:url";
import type { MDXContent } from "mdx/types.js";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Template } from "../Template.tsx";
import type { SiteRenderMeta } from "../../site.tsx";
import { makeTitle } from "../../utils/meta.ts";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx.tsx";
import { MdxRenderContext } from "../../mdx/MdxRenderContext.tsx";
import { getGitFileDates } from "../../utils/git.ts";
import { cachedPromise } from "xenon-ssg/promise";
import { watchInDev } from "xenon-ssg/watch";
import { Temporal } from "temporal-polyfill";
import { instantToBlogItemDate } from "../../utils/item-dates.ts";
import { SITE_ROOT_FOLDER } from "../../../config.ts";

type MdxPageModule = {
  default: MDXContent;
  title: string | undefined;
  description: string | undefined;
  tableOfContents: Toc;
};

type MdxPageProps = {
  siteRenderMeta: SiteRenderMeta;
};

export function makeMdxPage(contentFileUrl: string) {
  const isDev = process.env["NODE_ENV"] === "development";
  const filePath = url.fileURLToPath(contentFileUrl);

  const page = cachedPromise(
    async () => {
      // In dev, cache-bust the dynamic import so the watcher's `page.reset()`
      // actually picks up the new module instance — without the `?${Date.now()}`
      // suffix, Node's ESM module cache would return the same (stale) module
      // object even after the cachedPromise wrapper has been reset. In
      // production, use the bare URL to avoid leaking unique module
      // instances at build time. Same trick as `content-loader.ts` uses for
      // blog/timeline content.
      const importUrl = isDev
        ? `${contentFileUrl}?${Date.now()}`
        : contentFileUrl;
      const [module, gitDates] = await Promise.all([
        import(importUrl) as Promise<MdxPageModule>,
        getGitFileDates(SITE_ROOT_FOLDER, filePath),
      ]);

      return { module, gitDates };
    },
    {
      lazy: true,
    },
  );

  // On source-file change in dev, drop the cached module so the next render
  // re-imports a fresh one via the cache-busted URL above. Same mechanism
  // `content-loader.ts` uses for blog/timeline content.
  watchInDev(filePath, () => page.reset());

  return async function MdxPage({ siteRenderMeta }: MdxPageProps) {
    const {
      module: {
        default: Content,
        title,
        description,
        tableOfContents,
      },
      gitDates,
    } = await page.get();

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

    // A page that was never edited was last updated when it was created. No git history means it isn't committed
    // yet, i.e. it's being written right now.
    const lastUpdated =
      gitDates?.lastModifiedAt ?? gitDates?.createdAt ?? Temporal.Now.instant();

    return (
      <Template
        siteRenderMeta={siteRenderMeta}
        metaTags={{
          title: makeTitle([title]),
          description,
          socialTitle: title,
          socialDescription: description,
          openGraph: { type: "website" },
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
              lastModified={instantToBlogItemDate(lastUpdated)}
            />
          </MdxRenderContext>
        </section>
      </Template>
    );
  };
}
