import { Template } from "../Template";
import type { SiteRenderMeta } from "../../site";
import { makeTitle } from "../../utils/meta";
import {
  HOMEPAGE_BLURB_DESCRIPTION,
  HOMEPAGE_BLURB_SOCIAL_DESCRIPTION,
} from "../../../config";

type NotFoundProps = {
  siteRenderMeta: SiteRenderMeta;
};

export const NotFound: React.FC<NotFoundProps> = ({ siteRenderMeta }) => {
  const title = makeTitle(["404 – Page not found"]);

  return (
    <Template
      siteRenderMeta={siteRenderMeta}
      metaTags={{
        title,
        description: `The page you are looking for does not exist. ${HOMEPAGE_BLURB_DESCRIPTION}`,
        socialTitle: title,
        socialDescription: `Oops! This page doesn't exist. ${HOMEPAGE_BLURB_SOCIAL_DESCRIPTION}`,
        openGraph: { type: "website" },
      }}
    >
      <main className="container">
        <h2>Not found</h2>
        <p>The page you are looking for does not exist.</p>
      </main>
    </Template>
  );
};
