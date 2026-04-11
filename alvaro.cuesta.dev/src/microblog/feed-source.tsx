import { getMicroblogItems } from "./promise";
import { routeMicroblogPost } from "../routes";
import { htmlToPlainText } from "../utils/html";
import {
  renderContentItemHtml,
  buildFeedSourceItem,
  createFeedSource,
} from "../utils/feed-source";

const EXCERPT_LENGTH = 40;

function makeExcerptTitle(html: string): string {
  const text = htmlToPlainText(html).replace(/\n/g, " ").trim();

  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }

  return `${text.slice(0, EXCERPT_LENGTH)}…`;
}

export const getMicroblogFeedSourceItems = createFeedSource(
  getMicroblogItems,
  async (baseUrl, item) => {
    const pathname = routeMicroblogPost.build({ slug: item.module.slug });

    const html = await renderContentItemHtml({
      baseUrl,
      pathname,
      Component: item.module.Component,
    });

    return buildFeedSourceItem({
      pathname,
      title: makeExcerptTitle(html),
      render: () => html,
      publicationDate: item.module.publicationDate,
      lastModificationDate: item.module.lastModificationDate,
      tags: item.module.tags,
    });
  },
);
