import url from "node:url";
import type { MDXContent } from "mdx/types";
import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";
import { getGitLastModifiedDate } from "../../utils/git";
import { cachedPromise } from "xenon-ssg/src/promise";
import { watchInDev } from "xenon-ssg/src/watch";
import { Temporal } from "temporal-polyfill";
import { instantToBlogItemDate } from "../../utils/item-dates";

type MdxPageModule = {
  default: MDXContent;
  title: string | undefined;
  description: string | undefined;
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
      const [module, lastModified] = await Promise.all([
        import(importUrl) as Promise<MdxPageModule>,
        getGitLastModifiedDate(
          url.fileURLToPath(import.meta.resolve("../../")),
          filePath,
        ),
      ]);

      return { module, lastModified };
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
      module: { default: Content, title, description },
      lastModified,
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

    const effectiveLastModified = lastModified ?? Temporal.Now.instant();

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
          <Content
            components={MDX_DEFAULT_COMPONENTS}
            lastModified={instantToBlogItemDate(effectiveLastModified)}
          />
        </section>
      </Template>
    );
  };
}
