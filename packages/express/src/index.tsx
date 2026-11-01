import type { RenderToStreamOptions } from "@xenon-ssg/core/render";
import type { PluginInjectableTag, Plugin } from "./plugin.tsx";
import type { ReactNode } from "react";
import type { XenonRenderFunction } from "@xenon-ssg/core";
import type { UnknownRecord } from "type-fest";

export type XenonExpressSiteMeta = {
  origin: string;
  basepath: string;
  baseUrl: string;
};

export type XenonExpressRenderMeta = XenonExpressSiteMeta & {
  pathname: string;
  injectableRaw: PluginInjectableTag[];
  injectable: ReactNode[];
  injectableCritical: ReactNode[];
};

export type XenonExpressRenderFunction<PageMetadata extends UnknownRecord> = (
  meta: XenonExpressRenderMeta,
) => ReturnType<XenonRenderFunction<PageMetadata>>;

export type XenonExpressSite<
  PageMetadata extends UnknownRecord,
  // TODO: this any break typechecking unless careful (virality) but unknown makes things impossible
  Plugins extends Plugin<unknown, PageMetadata>[] = Plugin<any, PageMetadata>[],
> = {
  render: XenonExpressRenderFunction<PageMetadata>;
  renderToStreamOptions: RenderToStreamOptions;
  plugins: Plugins;
};

/**
 * The site meta for a site served at `basepath` (e.g. `/repo`, or `""` for the
 * root) of `origin` (e.g. `https://example.com`).
 *
 * Taken, not guessed: only whoever builds or serves the site knows where it'll
 * be, and a guess ends up in every absolute URL (canonical URLs, feeds,
 * sitemaps…) without anything failing.
 *
 * Both are made canonical, as everything joins them with site paths (e.g.
 * `${baseUrl}/blog/`): just the origin, even if given as a URL with a path
 * (e.g. `https://example.com/`), and the base path without trailing slashes
 * (so `/` is the root too).
 */
export function makeSiteMeta(
  origin: string,
  basepath: string = "",
): XenonExpressSiteMeta {
  const canonicalOrigin = new URL(origin).origin;
  const canonicalBasepath = basepath.replace(/\/+$/, "");

  if (canonicalBasepath !== "" && !canonicalBasepath.startsWith("/")) {
    throw new Error(
      `The base path must start with "/" (e.g. "/repo"), or be empty for the root: ${basepath}`,
    );
  }

  return {
    origin: canonicalOrigin,
    basepath: canonicalBasepath,
    baseUrl: `${canonicalOrigin}${canonicalBasepath}`,
  };
}
