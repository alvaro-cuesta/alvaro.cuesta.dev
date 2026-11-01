import type { RenderToStreamOptions } from "@xenon-ssg/core/render";
import { renderPage } from "@xenon-ssg/core/page";
import type { Request, Response, NextFunction } from "express";
import type { XenonRenderFunction } from "@xenon-ssg/core";
import type { UnknownRecord } from "type-fest";

export function makeXenonMiddleware<PageMetadata extends UnknownRecord>(
  render: XenonRenderFunction<PageMetadata>,
  options?: RenderToStreamOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction) => {
    // A rejection is left to Express 5, which forwards a rejected handler's
    // error to the error middleware chain.
    const page = await renderPage(render, req.path, {
      // No `addLink`: there's nothing to crawl when pages are rendered as
      // they're requested.
      renderToStreamOptions: options,
    });

    if ("redirect" in page) {
      res.redirect(page.redirect);
      return;
    }

    page.stream.on("error", (error) => {
      next(error);
    });

    page.stream.pipe(res);
  };
}
