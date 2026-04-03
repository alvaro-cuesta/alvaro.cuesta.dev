import type { BlogItem } from "./item";
import { routeBlogArticle, routeBlogTag } from "../routes";

type RewriteBlogMdxHrefOptions = {
  currentFilename: string;
  blogItems: Iterable<BlogItem>;
};

const makeBrokenBlogHrefError = (
  currentFilename: string,
  href: string,
  reason: string,
): Error =>
  new Error(
    `The blog post "${currentFilename}" contains a broken internal blog link "${href}": ${reason}`,
  );

const getCustomBlogLinkUrl = (href: string): URL | null => {
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

const rewriteCustomBlogHref = (
  href: string,
  currentFilename: string,
  blogItems: readonly BlogItem[],
): string | null => {
  const url = getCustomBlogLinkUrl(href);

  if (url === null) {
    return null;
  }

  const type = url.protocol.slice(0, -1);

  if (type !== "tag" && type !== "post-slug") {
    return null;
  }

  if (url.host !== "") {
    throw makeBrokenBlogHrefError(
      currentFilename,
      href,
      "protocol links must use an empty host, e.g. tag:///my-tag",
    );
  }

  const value = decodeURIComponent(trimLeadingSlashes(url.pathname));

  if (value.length === 0) {
    throw makeBrokenBlogHrefError(currentFilename, href, "target is empty");
  }

  const hasPostWithSlug = blogItems.some((item) => item.module.slug === value);
  const hasTagWithSlug = blogItems.some((item) =>
    item.module.tags.some((tag) => tag.slug === value),
  );

  switch (type) {
    case "tag":
      if (!hasTagWithSlug) {
        throw makeBrokenBlogHrefError(
          currentFilename,
          href,
          `tag "${value}" does not exist`,
        );
      }

      return `${routeBlogTag.build({ tag: value })}${url.search}${url.hash}`;
    case "post-slug":
      if (!hasPostWithSlug) {
        throw makeBrokenBlogHrefError(
          currentFilename,
          href,
          `post slug "${value}" does not exist`,
        );
      }

      return `${routeBlogArticle.build({ slug: value })}${url.search}${url.hash}`;
    default:
      return null;
  }
};

export const rewriteBlogMdxHref = (
  href: string | undefined,
  { currentFilename, blogItems }: RewriteBlogMdxHrefOptions,
): string | undefined => {
  if (href === undefined) {
    return href;
  }

  const rewrittenCustomHref = rewriteCustomBlogHref(href, currentFilename, [
    ...blogItems,
  ]);

  return rewrittenCustomHref ?? href;
};
