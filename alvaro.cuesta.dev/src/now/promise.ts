import type { MDXContent } from "mdx/types";
import { suspendablePromiseMaker } from "xenon-ssg/src/promise";

export type NowPageModule = {
  Component: MDXContent;
};

const loadNowPage = async (): Promise<NowPageModule> => {
  const nowPageUrl = new URL(`../../now/now.mdx`, import.meta.url);
  const rawModule = await import(`${nowPageUrl}?${Date.now()}`);

  return {
    Component: rawModule.default,
  };
};

const { use } = suspendablePromiseMaker(loadNowPage, {
  lazy: true,
});

export const useNowPage = use;
