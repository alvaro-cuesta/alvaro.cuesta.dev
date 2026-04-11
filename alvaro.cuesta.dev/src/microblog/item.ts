import type { MicroblogItemModuleParsed } from "./item-module";

export type MicroblogItem = {
  filename: string;
  module: MicroblogItemModuleParsed;
};
