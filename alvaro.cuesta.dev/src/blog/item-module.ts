import type { MDXContent } from "mdx/types";
import { parseBlogItemFilename } from "./item-filename";
import {
  dateToBlogItemDate,
  isBlogItemDate,
  type BlogItemDate,
} from "./item-dates";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { Temporal } from "temporal-polyfill";
import { VALID_SLUG_REGEX } from "../utils/slug";

// TODO: Allow strings with the same parsing mechanism as filenames
type BlogItemModuleDate =
  // Will imply "dateTimeWithSeconds"
  | Date
  // Will imply "yearMonth"
  | Temporal.PlainYearMonth
  // Will imply "date"
  | Temporal.PlainDate
  // Will imply "dateTimeWithSeconds"
  | Temporal.PlainDateTime
  // Our true value
  | BlogItemDate;

const isBlogItemModuleDate = (x: unknown): x is BlogItemModuleDate => {
  return (
    x instanceof Date ||
    x instanceof Temporal.PlainYearMonth ||
    x instanceof Temporal.PlainDate ||
    x instanceof Temporal.PlainDateTime ||
    isBlogItemDate(x)
  );
};

const blogItemModuleDateToBlogItemDate = (
  x: BlogItemModuleDate,
): BlogItemDate => {
  if (x instanceof Date) {
    return dateToBlogItemDate(x);
  }

  if (x instanceof Temporal.PlainYearMonth) {
    return {
      type: "yearMonth",
      yearMonth: x,
    };
  }

  if (x instanceof Temporal.PlainDate) {
    return {
      type: "date",
      date: x,
    };
  }

  if (x instanceof Temporal.PlainDateTime) {
    return {
      type: "dateTimeWithSeconds",
      dateTime: x,
    };
  }

  return x;
};

type BlogItemModule = NodeModule & {
  // The default export of the MDX file
  default: MDXContent;

  // Known properties exportable from the MDX file
  title?: string | undefined;
  creationDate?: BlogItemModuleDate | undefined;
  publicationDate?: BlogItemModuleDate | undefined;
  lastModificationDate?: BlogItemModuleDate | undefined;
  draft?: boolean | undefined;
  slug?: string | undefined;
  tags?: string[] | undefined;

  // Injected automatically by plugins
  tableOfContents: Toc;
};

function assertIsBlogItemModule(
  module: NodeModule,
): asserts module is BlogItemModule {
  if (!("default" in module)) {
    throw new Error("Blog module does not have a default export.");
  }

  if (typeof module.default !== "function") {
    throw new Error(
      `Default export in blog module is not a \`function\`, but a \`${typeof module.default}\`.`,
    );
  }

  if (
    !("isMDXComponent" in module.default) ||
    typeof module.default.isMDXComponent !== "boolean" ||
    !module.default.isMDXComponent
  ) {
    throw new Error(`Default export in blog module is not an MDX component.`);
  }

  if (
    "title" in module &&
    module.title !== undefined &&
    typeof module.title !== "string"
  ) {
    throw new Error(
      `\`title\` in blog post is not a \`string\`, but a \`${typeof module.title}\`.`,
    );
  }

  if (
    "creationDate" in module &&
    module.creationDate !== undefined &&
    !isBlogItemModuleDate(module.creationDate)
  ) {
    throw new Error(
      `\`creationDate\` in blog post is not a \`BlogItemModuleDate\`, but a \`${typeof module.creationDate}\`.`,
    );
  }

  if (
    "publicationDate" in module &&
    module.publicationDate !== undefined &&
    !isBlogItemModuleDate(module.publicationDate)
  ) {
    throw new Error(
      `\`publicationDate\` in blog post is not a \`BlogItemModuleDate\`, but a \`${typeof module.publicationDate}\`.`,
    );
  }

  if (
    "lastModificationDate" in module &&
    module.lastModificationDate !== undefined &&
    !isBlogItemModuleDate(module.lastModificationDate)
  ) {
    throw new Error(
      `\`lastModificationDate\` in blog post is not a \`BlogItemModuleDate\`, but a \`${typeof module.lastModificationDate}\`.`,
    );
  }

  if (
    "draft" in module &&
    module.draft !== undefined &&
    typeof module.draft !== "boolean"
  ) {
    throw new Error(
      `\`draft\` in blog post is not a \`boolean\`, but a \`${typeof module.draft}\`.`,
    );
  }

  if (
    "slug" in module &&
    module.slug !== undefined &&
    typeof module.slug !== "string"
  ) {
    throw new Error(
      `\`slug\` in blog post is not a \`string\`, but a \`${typeof module.slug}\`.`,
    );
  }

  if ("tags" in module && module.tags !== undefined) {
    if (!Array.isArray(module.tags)) {
      throw new Error(
        `\`tags\` in blog post is not an \`array\`, but a \`${typeof module.tags}\`.`,
      );
    }

    for (let i = 0; i < module.tags.length; i++) {
      if (typeof module.tags[i] !== "string") {
        throw new Error(
          `\`tags[${i}]\` in blog post is not a \`string\`, but a \`${typeof module
            .tags[i]}\`.`,
        );
      }

      // TODO: Assert that tags are sluggable
      // TODO: Asser that tags are unique
    }
  }

  if (!("tableOfContents" in module)) {
    throw new Error("Blog module does not have a `tableOfContents` export.");
  }

  if (!Array.isArray(module.tableOfContents)) {
    throw new Error(
      `\`tableOfContents\` in blog post is not an \`array\`, but a \`${typeof module.tableOfContents}\`.`,
    );
  }
  // At this point we'll assume tableOfContents is a Toc
}

export type BlogItemModuleParsed = {
  Component: MDXContent;

  title: string;
  creationDate: BlogItemDate;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  draft: boolean;
  slug: string;
  tags: string[];
  tableOfContents: Toc;
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
    ? blogItemModuleDateToBlogItemDate(module.creationDate)
    : parsedFilename.possibleCreationDate;
  if (creationDate === null) {
    throw new Error(
      `The \`creationDate\` of the blog post is not specified in the module or the filename`,
    );
  }

  const publicationDate = module.publicationDate
    ? blogItemModuleDateToBlogItemDate(module.publicationDate)
    : creationDate;

  const lastModificationDate = module.lastModificationDate
    ? blogItemModuleDateToBlogItemDate(module.lastModificationDate)
    : null;

  return {
    Component: module.default,
    title: module.title ?? unslugify(slug),
    creationDate,
    publicationDate,
    lastModificationDate,
    draft: module.draft ?? false,
    slug,
    tags: module.tags ?? [],
    tableOfContents: module.tableOfContents,
  };
};
