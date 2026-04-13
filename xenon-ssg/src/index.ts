import type { ReactNode } from "react";
import type { UnknownRecord } from "type-fest";

export type XenonRenderResult<PageMetadata extends UnknownRecord> = {
  reactNode: ReactNode;
  metadata: PageMetadata;
};

/**
 * Render a page. May be sync or async — Xenon's middleware and build pipeline
 * both `await` the result, so returning a `Promise` is fine when the render
 * function needs to do lazy init or fetch something per-request.
 */
export type XenonRenderFunction<PageMetadata extends UnknownRecord> = (
  pathname: string,
) => XenonRenderResult<PageMetadata> | Promise<XenonRenderResult<PageMetadata>>;
