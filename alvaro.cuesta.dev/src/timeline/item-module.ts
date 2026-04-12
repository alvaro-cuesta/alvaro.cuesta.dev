import type { MDXContent } from "mdx/types";
import type { Toc } from "@stefanprobst/rehype-extract-toc";
import { parseTimelineItemFilename } from "./item-filename";
import {
  type BlogItemDate,
  type ItemModuleDate,
  blogItemDateToPlainDateTime,
  itemModuleDateToBlogItemDate,
  resolveLastModificationDate,
} from "../utils/item-dates";
import {
  assertIsContentItemModule,
  assertOptionalStringArray,
} from "../utils/item-module-assertions";

type TimelineItemModule = NodeModule & {
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

function assertIsTimelineItemModule(
  module: NodeModule,
): asserts module is TimelineItemModule {
  const label = "timeline post";

  assertIsContentItemModule(module, label);
  assertOptionalStringArray(module, "hashtags", label);
}

export function timelineSlugFromDate(date: BlogItemDate): string {
  const dt = blogItemDateToPlainDateTime(date);
  return `${dt.year.toString().padStart(4, "0")}${dt.month
    .toString()
    .padStart(2, "0")}${dt.day.toString().padStart(2, "0")}${dt.hour
    .toString()
    .padStart(2, "0")}${dt.minute.toString().padStart(2, "0")}`;
}

export type TimelineItemModuleParsed = {
  Component: MDXContent;
  slug: string;
  creationDate: BlogItemDate;
  publicationDate: BlogItemDate;
  lastModificationDate: BlogItemDate | null;
  draft: boolean;
  tags: string[];
  tableOfContents: Toc;
  implicit: boolean;
};

type TimelineItemModuleInferredMetadata = {
  lastModificationDate: ItemModuleDate | null;
};

export const parseTimelineItemModuleFromImportModule = (
  filename: string,
  module: NodeModule,
  inferredMetadata: TimelineItemModuleInferredMetadata,
): TimelineItemModuleParsed => {
  assertIsTimelineItemModule(module);

  const parsedFilename = parseTimelineItemFilename(filename);

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
    slug: timelineSlugFromDate(creationDate),
    creationDate,
    publicationDate,
    lastModificationDate,
    draft: module.draft ?? false,
    tags: module.hashtags ?? [],
    tableOfContents: module.tableOfContents,
    implicit: false,
  };
};
