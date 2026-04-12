import type { AnalyzedItems } from "./analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";
import type { TimelineItemModuleParsed } from "../timeline/item-module";
import {
  routeBlogArticle,
  routeBlogTag,
  routeBlogYear,
  routeTimelinePost,
  routeTimelineTag,
  routeTimelineYear,
} from "../routes";

type RewriteContext = {
  blogItems: AnalyzedItems<BlogItemModuleParsed>;
  timelineItems: AnalyzedItems<TimelineItemModuleParsed>;
};

const SUPPORTED_PROTOCOLS = new Set([
  "blog-post",
  "blog-tag",
  "blog-year",
  "timeline-post",
  "timeline-tag",
  "timeline-year",
]);

const parseCustomProtocolUrl = (href: string): URL | null => {
  try {
    return new URL(href);
  } catch {
    return null;
  }
};

const trimLeadingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.startsWith("/")) {
    trimmedValue = trimmedValue.slice(1);
  }

  return trimmedValue;
};

const makeBrokenHrefError = (href: string, reason: string): Error =>
  new Error(`Broken internal link "${href}": ${reason}`);

export const rewriteCustomProtocolHref = (
  href: string | undefined,
  { blogItems, timelineItems }: RewriteContext,
): string | undefined => {
  if (href === undefined) {
    return href;
  }

  const url = parseCustomProtocolUrl(href);

  if (url === null) {
    return href;
  }

  const protocol = url.protocol.slice(0, -1);

  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    return href;
  }

  if (url.host !== "") {
    throw makeBrokenHrefError(
      href,
      "protocol links must use an empty host, e.g. blog-tag:///my-tag",
    );
  }

  const value = decodeURIComponent(trimLeadingSlashes(url.pathname));

  if (value.length === 0) {
    throw makeBrokenHrefError(href, "target is empty");
  }

  const suffix = `${url.search}${url.hash}`;

  switch (protocol) {
    case "blog-post": {
      if (!blogItems.bySlug.has(value)) {
        throw makeBrokenHrefError(
          href,
          `blog post slug "${value}" does not exist`,
        );
      }

      return `${routeBlogArticle.build({ slug: value })}${suffix}`;
    }

    case "blog-tag": {
      if (!blogItems.byTag.has(value)) {
        throw makeBrokenHrefError(href, `blog tag "${value}" does not exist`);
      }

      return `${routeBlogTag.build({ tag: value })}${suffix}`;
    }

    case "blog-year": {
      const year = parseInt(value, 10);

      if (Number.isNaN(year) || !blogItems.byYear.has(year)) {
        throw makeBrokenHrefError(href, `blog year "${value}" does not exist`);
      }

      return `${routeBlogYear.build({ year })}${suffix}`;
    }

    case "timeline-post": {
      if (!timelineItems.bySlug.has(value)) {
        throw makeBrokenHrefError(
          href,
          `timeline post "${value}" does not exist`,
        );
      }

      return `${routeTimelinePost.build({ slug: value })}${suffix}`;
    }

    case "timeline-tag": {
      if (!timelineItems.byTag.has(value)) {
        throw makeBrokenHrefError(
          href,
          `timeline tag "${value}" does not exist`,
        );
      }

      return `${routeTimelineTag.build({ tag: value, page: null })}${suffix}`;
    }

    case "timeline-year": {
      const year = parseInt(value, 10);

      if (Number.isNaN(year) || !timelineItems.byYear.has(year)) {
        throw makeBrokenHrefError(
          href,
          `timeline year "${value}" does not exist`,
        );
      }

      return `${routeTimelineYear.build({ year, page: null })}${suffix}`;
    }

    default:
      return href;
  }
};
