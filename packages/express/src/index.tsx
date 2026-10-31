import type { RenderToStreamOptions } from "@xenon-ssg/core/render";
import type { PluginInjectableTag, Plugin } from "./plugin.tsx";
import type { ReactNode } from "react";
import type { XenonRenderFunction } from "@xenon-ssg/core";
import type { UnknownRecord } from "type-fest";

export const DEFAULT_DEV_PORT = 31337;

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
 * `port` is the dev server's, which makes the origin unless `XENON_ORIGIN` sets
 * it.
 */
export function getSiteMeta(
  port: number = DEFAULT_DEV_PORT,
): XenonExpressSiteMeta {
  const origin = process.env["XENON_ORIGIN"] ?? `http://localhost:${port}`;

  const basepath = process.env["XENON_BASE_PATH"] ?? "";

  return {
    origin,
    basepath,
    baseUrl: `${origin}${basepath}`,
  };
}
