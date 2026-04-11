import type { MDXContent } from "mdx/types";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { parseMicroblogItemFilename } from "./item-filename";
import {
  type BlogItemDate,
  type ItemModuleDate,
  itemModuleDateToBlogItemDate,
  resolveLastModificationDate,
} from "../utils/item-dates";
import {
  assertIsContentItemModule,
  assertOptionalStringArray,
} from "../utils/item-module-assertions";

type MicroblogItemModule = NodeModule & {
  default: MDXContent;

  // Known properties exportable from the MDX file
  creationDate?: ItemModuleDate | undefined;
  publicationDate?: ItemModuleDate | undefined;
  lastModificationDate?: ItemModuleDate | undefined;
  draft?: boolean | undefined;

  // Injected automatically by plugins
  hashtags?: string[] | undefined;
  tableOfContents: Toc;
};

function assertIsMicroblogItemModule(
  module: NodeModule,
): asserts module is MicroblogItemModule {
  const label = "microblog post";

  assertIsContentItemModule(module, label);
  assertOptionalStringArray(module, "hashtags", label);
}

function microblogSlugFromCreationDate(creationDate: BlogItemDate): string {
  if (creationDate.type !== "dateTimeNoSeconds") {
    throw new Error(
      `Cannot infer microblog slug from creation date of type "${creationDate.type}".`,
    );
  }

  const dt = creationDate.dateTime;
  return `${dt.year.toString().padStart(4, "0")}${dt.month
    .toString()
    .padStart(2, "0")}${dt.day.toString().padStart(2, "0")}${dt.hour
    .toString()
    .padStart(2, "0")}${dt.minute.toString().padStart(2, "0")}`;
}

export type MicroblogItemModuleParsed = {
  Component: MDXContent;
  slug: string;
  creationDate: BlogItemDate;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  draft: boolean;
  tags: string[];
  tableOfContents: Toc;
};

type MicroblogItemModuleInferredMetadata = {
  lastModificationDate: ItemModuleDate | null;
};

export const parseMicroblogItemModuleFromImportModule = (
  filename: string,
  module: NodeModule,
  inferredMetadata: MicroblogItemModuleInferredMetadata,
): MicroblogItemModuleParsed => {
  assertIsMicroblogItemModule(module);

  const parsedFilename = parseMicroblogItemFilename(filename);

  const creationDate = module.creationDate
    ? itemModuleDateToBlogItemDate(module.creationDate)
    : parsedFilename.creationDate;

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
    slug: microblogSlugFromCreationDate(creationDate),
    creationDate,
    publicationDate,
    lastModificationDate,
    draft: module.draft ?? false,
    tags: module.hashtags ?? [],
    tableOfContents: module.tableOfContents,
  };
};
