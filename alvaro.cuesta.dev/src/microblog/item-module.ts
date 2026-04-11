import type { MDXContent } from "mdx/types";
import { parseMicroblogItemFilename } from "./item-filename";
import {
  compareBlogItemDates,
  dateToBlogItemDate,
  instantToBlogItemDate,
  isBlogItemDate,
  type BlogItemDate,
} from "../utils/item-dates";
import { Temporal } from "temporal-polyfill";

type MicroblogItemModuleDate =
  | Date
  | Temporal.Instant
  | Temporal.PlainYearMonth
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | BlogItemDate;

const isMicroblogItemModuleDate = (
  x: unknown,
): x is MicroblogItemModuleDate => {
  return (
    x instanceof Date ||
    x instanceof Temporal.PlainYearMonth ||
    x instanceof Temporal.PlainDate ||
    x instanceof Temporal.PlainDateTime ||
    isBlogItemDate(x)
  );
};

const microblogItemModuleDateToBlogItemDate = (
  x: MicroblogItemModuleDate,
): BlogItemDate => {
  if (x instanceof Date) {
    return dateToBlogItemDate(x);
  }

  if (x instanceof Temporal.Instant) {
    return instantToBlogItemDate(x);
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

type MicroblogItemModule = NodeModule & {
  default: MDXContent;
  creationDate?: MicroblogItemModuleDate | undefined;
  publicationDate?: MicroblogItemModuleDate | undefined;
  lastModificationDate?: MicroblogItemModuleDate | undefined;
  draft?: boolean | undefined;
  hashtags?: string[] | undefined;
};

function assertIsMicroblogItemModule(
  module: NodeModule,
): asserts module is MicroblogItemModule {
  if (!("default" in module)) {
    throw new Error("Microblog module does not have a default export.");
  }

  if (typeof module.default !== "function") {
    throw new Error(
      `Default export in microblog module is not a \`function\`, but a \`${typeof module.default}\`.`,
    );
  }

  if (
    !("isMDXComponent" in module.default) ||
    typeof module.default.isMDXComponent !== "boolean" ||
    !module.default.isMDXComponent
  ) {
    throw new Error(
      `Default export in microblog module is not an MDX component.`,
    );
  }

  if (
    "creationDate" in module &&
    module.creationDate !== undefined &&
    !isMicroblogItemModuleDate(module.creationDate)
  ) {
    throw new Error(
      `\`creationDate\` in microblog post is not a valid date type.`,
    );
  }

  if (
    "publicationDate" in module &&
    module.publicationDate !== undefined &&
    !isMicroblogItemModuleDate(module.publicationDate)
  ) {
    throw new Error(
      `\`publicationDate\` in microblog post is not a valid date type.`,
    );
  }

  if (
    "lastModificationDate" in module &&
    module.lastModificationDate !== undefined &&
    !isMicroblogItemModuleDate(module.lastModificationDate)
  ) {
    throw new Error(
      `\`lastModificationDate\` in microblog post is not a valid date type.`,
    );
  }

  if (
    "draft" in module &&
    module.draft !== undefined &&
    typeof module.draft !== "boolean"
  ) {
    throw new Error(
      `\`draft\` in microblog post is not a \`boolean\`, but a \`${typeof module.draft}\`.`,
    );
  }

  if (
    "hashtags" in module &&
    module.hashtags !== undefined &&
    (!Array.isArray(module.hashtags) ||
      !module.hashtags.every((t: unknown) => typeof t === "string"))
  ) {
    throw new Error(
      `\`hashtags\` in microblog post is not a \`string[]\`.`,
    );
  }
}

export type MicroblogItemModuleParsed = {
  Component: MDXContent;
  creationDate: BlogItemDate;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  draft: boolean;
  tags: string[];
};

type MicroblogItemModuleInferredMetadata = {
  lastModificationDate: MicroblogItemModuleDate | null;
};

export const parseMicroblogItemModuleFromImportModule = (
  filename: string,
  module: NodeModule,
  inferredMetadata: MicroblogItemModuleInferredMetadata,
): MicroblogItemModuleParsed => {
  assertIsMicroblogItemModule(module);

  const parsedFilename = parseMicroblogItemFilename(filename);

  const creationDate = module.creationDate
    ? microblogItemModuleDateToBlogItemDate(module.creationDate)
    : parsedFilename.creationDate;

  const publicationDate = module.publicationDate
    ? microblogItemModuleDateToBlogItemDate(module.publicationDate)
    : creationDate;

  const inferredLastModificationDate =
    inferredMetadata.lastModificationDate === null
      ? null
      : microblogItemModuleDateToBlogItemDate(
          inferredMetadata.lastModificationDate,
        );

  const lastModificationDate = module.lastModificationDate
    ? microblogItemModuleDateToBlogItemDate(module.lastModificationDate)
    : inferredLastModificationDate !== null &&
        compareBlogItemDates(inferredLastModificationDate, publicationDate) >= 0
      ? inferredLastModificationDate
      : null;

  return {
    Component: module.default,
    creationDate,
    publicationDate,
    lastModificationDate,
    draft: module.draft ?? false,
    tags: module.hashtags ?? [],
  };
};
