import { getBlogItems } from "./promise";
import { routeBlogArticle } from "../routes";
import {
  renderContentItemHtml,
  buildFeedSourceItem,
  createFeedSource,
} from "../utils/feed-source";

export const getBlogFeedSourceItems = createFeedSource(
  getBlogItems,
  (baseUrl, item) => {
    const pathname = routeBlogArticle.build({ slug: item.module.slug });

    return buildFeedSourceItem({
      pathname,
      title: item.module.title,
      summary: item.module.summary ?? undefined,
      render: () =>
        renderContentItemHtml({
          baseUrl,
          pathname,
          Component: item.module.Component,
        }),
      publicationDate: item.module.publicationDate,
      lastModificationDate: item.module.lastModificationDate,
      tags: item.module.tags.map((tag) => tag.slug),
    });
  },
);
