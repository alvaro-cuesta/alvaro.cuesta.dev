import type { MDXContent } from "mdx/types";
import { parseBlogItemFilename } from "./item-filename";
import {
  type BlogItemDate,
  type ItemModuleDate,
  itemModuleDateToBlogItemDate,
  resolveLastModificationDate,
} from "../utils/item-dates";
import {
  assertIsContentItemModule,
  assertOptionalString,
  assertOptionalStringArray,
} from "../utils/item-module-assertions";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { VALID_SLUG_REGEX } from "../utils/slug";

type BlogItemModule = NodeModule & {
  // The default export of the MDX file
  default: MDXContent;

  // Known properties exportable from the MDX file
  title?: string | undefined;
  summary?: string | undefined;
  creationDate?: ItemModuleDate | undefined;
  publicationDate?: ItemModuleDate | undefined;
  lastModificationDate?: ItemModuleDate | undefined;
  draft?: boolean | undefined;
  slug?: string | undefined;
  tags?: string[] | undefined;

  // Injected automatically by plugins
  tableOfContents: Toc;
};

function assertIsBlogItemModule(
  module: NodeModule,
): asserts module is BlogItemModule {
  const label = "blog post";

  assertIsContentItemModule(module, label);
  assertOptionalString(module, "title", label);
  assertOptionalString(module, "summary", label);
  assertOptionalString(module, "slug", label);
  assertOptionalStringArray(module, "tags", label);
}

type BlogItemModuleParsedTag = {
  original: string;
  slug: string;
};

export type BlogItemModuleParsed = {
  Component: MDXContent;

  title: string;
  summary: string | null;
  creationDate: BlogItemDate;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  draft: boolean;
  slug: string;
  tags: BlogItemModuleParsedTag[];
  tableOfContents: Toc;
};

type BlogItemModuleInferredMetadata = {
  lastModificationDate: ItemModuleDate | null;
};

const unslugify = (slug: string): string => {
  return slug
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
};

export const parseBlogItemModuleFromImportModule = (
  filename: string,
  module: NodeModule,
  inferredMetadata: BlogItemModuleInferredMetadata,
): BlogItemModuleParsed => {
  assertIsBlogItemModule(module);

  const parsedFilename = parseBlogItemFilename(filename);

  const slug = module.slug ?? parsedFilename.possibleSlug;
  if (!VALID_SLUG_REGEX.test(slug)) {
    throw new Error(
      `The slug "${slug}" is not a valid URL slug. It must match the regular expression ${VALID_SLUG_REGEX}.`,
    );
  }

  const creationDate = module.creationDate
    ? itemModuleDateToBlogItemDate(module.creationDate)
    : parsedFilename.possibleCreationDate;
  if (creationDate === null) {
    throw new Error(
      `The \`creationDate\` of the blog post is not specified in the module or the filename`,
    );
  }

  const publicationDate = module.publicationDate
    ? itemModuleDateToBlogItemDate(module.publicationDate)
    : creationDate;

  const lastModificationDate = resolveLastModificationDate(
    module.lastModificationDate,
    inferredMetadata.lastModificationDate,
    publicationDate,
  );

  return {
    Component: module.default,
    title: module.title ?? unslugify(slug),
    summary: module.summary ?? null,
    creationDate,
    publicationDate,
    lastModificationDate,
    draft: module.draft ?? false,
    slug,
    tags: (module.tags ?? []).map((tag) => ({
      original: tag,
      slug: tag.toLowerCase().replace(/\s+/g, "-"),
    })),
    tableOfContents: module.tableOfContents,
  };
};
