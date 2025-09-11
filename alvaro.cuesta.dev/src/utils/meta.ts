import { SITE_TITLE } from "../../config";

const SEPARATOR = " | ";

type TitleFragment = string | null | undefined | false;

export function buildFragments(fragments: TitleFragment[]): string {
  return fragments.filter((x) => x).join(SEPARATOR);
}

type MakeTitleOptions = {
  disableReverse?: boolean;
};

export function makeTitle(
  fragments: TitleFragment[],
  options?: MakeTitleOptions,
): string {
  const actualFragments = [SITE_TITLE, ...fragments];

  return buildFragments(
    options?.disableReverse ? actualFragments : actualFragments.toReversed(),
  );
}
