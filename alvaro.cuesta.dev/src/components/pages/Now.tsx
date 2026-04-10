import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";

const nowPageUrl = new URL(`../../../now/now.mdx`, import.meta.url);

const { use: useNowContent } = suspendablePromiseMaker(
  async () => (await import(`${nowPageUrl}?${Date.now()}`)).default,
  { lazy: true },
);

type NowProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const Now: React.FC<NowProps> = ({ siteRenderMeta }) => {
  const NowContent = useNowContent();

  const title = makeTitle(["Now"]);

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title,
        description:
          "What Álvaro Cuesta is currently focused on — a Now page.",
        socialTitle: "Now",
        socialDescription:
          "What Álvaro Cuesta is currently focused on — a Now page.",
        openGraph: { type: "website" },
      }}
    >
      <h2>Now</h2>
      <section>
        <NowContent components={MDX_DEFAULT_COMPONENTS} />
      </section>
    </Template>
  );
};
