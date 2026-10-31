import { getContentHash, getFileHash } from "./crypto.ts";

const CACHE_BUSTING_FRAGMENT_ENCODING = "base64url";
const CACHE_BUSTING_FRAGMENT_LENGTH = 8;

export async function getCacheBustingFragmentFile(
  filepath: string,
): Promise<string> {
  const hash = await getFileHash(filepath, CACHE_BUSTING_FRAGMENT_ENCODING);
  return hash.slice(0, CACHE_BUSTING_FRAGMENT_LENGTH);
}

export async function getCacheBustingFragmentContent(
  content: string | NodeJS.ArrayBufferView,
): Promise<string> {
  const hash = await getContentHash(content, CACHE_BUSTING_FRAGMENT_ENCODING);
  return hash.slice(0, CACHE_BUSTING_FRAGMENT_LENGTH);
}

export function getCacheBustedFilename(
  fileName: string,
  fragment: string,
): string {
  const lastIndexOfDot = fileName.lastIndexOf(".");

  if (lastIndexOfDot >= 0) {
    const base = fileName.slice(0, lastIndexOfDot);
    const ext = fileName.slice(lastIndexOfDot + 1);
    return `${base}.${fragment}.${ext}`;
  } else {
    return `${fileName}.${fragment}`;
  }
}
