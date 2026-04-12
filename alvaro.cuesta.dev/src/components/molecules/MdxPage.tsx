import url from "node:url";
import type { MDXContent } from "mdx/types";
import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";
import { getGitLastModifiedDate } from "../../utils/git";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";
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
  const promise = suspendablePromiseMaker(
    async () => {
      const [module, lastModified] = await Promise.all([
        import(contentFileUrl) as Promise<MdxPageModule>,
        getGitLastModifiedDate(
          url.fileURLToPath(import.meta.resolve("../../")),
          url.fileURLToPath(contentFileUrl),
        ),
      ]);

      return { module, lastModified };
    },
    {
      lazy: true,
    },
  );

  return function MdxPage({ siteRenderMeta }: MdxPageProps) {
    const {
      module: { default: Content, title, description },
      lastModified,
    } = promise.use();

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
