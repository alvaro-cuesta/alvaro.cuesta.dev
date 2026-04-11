import type { AnalyzedItems } from "./analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";
import type { MicroblogItemModuleParsed } from "../microblog/item-module";
import {
  routeBlogArticle,
  routeBlogTag,
  routeBlogYear,
  routeMicroblogPost,
  routeMicroblogTag,
  routeMicroblogYear,
} from "../routes";

type RewriteContext = {
  blogItems: AnalyzedItems<BlogItemModuleParsed>;
  microblogItems: AnalyzedItems<MicroblogItemModuleParsed>;
};

const SUPPORTED_PROTOCOLS = new Set([
  "blog-post",
  "blog-tag",
  "blog-year",
  "microblog-post",
  "microblog-tag",
  "microblog-year",
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
  { blogItems, microblogItems }: RewriteContext,
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

    case "microblog-post": {
      if (!microblogItems.bySlug.has(value)) {
        throw makeBrokenHrefError(
          href,
          `microblog post "${value}" does not exist`,
        );
      }

      return `${routeMicroblogPost.build({ slug: value })}${suffix}`;
    }

    case "microblog-tag": {
      if (!microblogItems.byTag.has(value)) {
        throw makeBrokenHrefError(
          href,
          `microblog tag "${value}" does not exist`,
        );
      }

      return `${routeMicroblogTag.build({ tag: value, page: null })}${suffix}`;
    }

    case "microblog-year": {
      const year = parseInt(value, 10);

      if (Number.isNaN(year) || !microblogItems.byYear.has(year)) {
        throw makeBrokenHrefError(
          href,
          `microblog year "${value}" does not exist`,
        );
      }

      return `${routeMicroblogYear.build({ year, page: null })}${suffix}`;
    }

    default:
      return href;
  }
};
