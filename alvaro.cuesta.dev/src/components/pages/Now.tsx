import url from "node:url";
import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";
import NowContent from "./Now.mdx";
import { getGitLastModifiedDate } from "../../utils/git";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";
import { Temporal } from "temporal-polyfill";
import { instantToBlogItemDate } from "../../utils/item-dates";

type NowProps = {
  siteRenderMeta: SiteRenderMeta;
};

const lastModifiedPromise = suspendablePromiseMaker(
  async () => {
    return getGitLastModifiedDate(
      url.fileURLToPath(import.meta.resolve("../../")),
      url.fileURLToPath(import.meta.resolve("./Now.mdx")),
    );
  },
  {
    lazy: true,
  },
);

export const Now: React.FC<NowProps> = ({ siteRenderMeta }) => {
  const title = makeTitle(["Now"]);

  const lastModified = lastModifiedPromise.use() ?? Temporal.Now.instant();

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title,
        description: "What Álvaro Cuesta is currently focused on.",
        socialTitle: "Now",
        socialDescription: "What Álvaro Cuesta is currently focused on.",
        openGraph: { type: "website" },
      }}
    >
      <h2>Now</h2>
      <section>
        <NowContent
          components={MDX_DEFAULT_COMPONENTS}
          lastModified={instantToBlogItemDate(lastModified)}
        />
      </section>
    </Template>
  );
};
