import type { RenderToStreamOptions } from "xenon-ssg/src/render";
import type { PluginInjectableTag, Plugin } from "./plugins/plugins";
import type { ReactNode } from "react";
import { DEFAULT_DEV_PORT } from "./dev";
import type { XenonRenderFunction } from "xenon-ssg/src";
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
  devPort?: number;
};

export function getSiteMeta<PageMetadata extends UnknownRecord>(
  site: XenonExpressSite<PageMetadata>,
): XenonExpressSiteMeta {
  const origin =
    process.env["XENON_ORIGIN"] ??
    `http://localhost:${site.devPort ?? DEFAULT_DEV_PORT}`;

  const basepath = process.env["XENON_BASE_PATH"] ?? "";

  return {
    origin,
    basepath,
    baseUrl: `${origin}${basepath}`,
  };
}
