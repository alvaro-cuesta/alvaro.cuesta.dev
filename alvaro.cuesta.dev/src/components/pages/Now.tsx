import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import { useNowPage } from "../../now/promise";
import { MDX_DEFAULT_COMPONENTS } from "../../mdx/mdx";

type NowProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const Now: React.FC<NowProps> = ({ siteRenderMeta }) => {
  const { Component } = useNowPage();

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
        <Component components={MDX_DEFAULT_COMPONENTS} />
      </section>
    </Template>
  );
};
