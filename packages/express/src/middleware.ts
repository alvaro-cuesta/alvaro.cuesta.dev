import type { RenderToStreamOptions } from "@xenon-ssg/core/render";
import { renderPage } from "@xenon-ssg/core/page";
import { toServedHref } from "@xenon-ssg/core/url";
import type { Request, Response, NextFunction } from "express";
import type { XenonRenderFunction } from "@xenon-ssg/core";
import type { UnknownRecord } from "type-fest";

type XenonMiddlewareOptions = {
  /**
   * Where the middleware's app is served (e.g. `/repo`), which its requests'
   * paths are relative to, as Express makes them in a mounted app.
   */
  basepath: string;
  renderToStreamOptions?: RenderToStreamOptions | undefined;
};

export function makeXenonMiddleware<PageMetadata extends UnknownRecord>(
  render: XenonRenderFunction<PageMetadata>,
  { basepath, renderToStreamOptions }: XenonMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction) => {
    // A rejection is left to Express 5, which forwards a rejected handler's
    // error to the error middleware chain.
    const page = await renderPage(render, req.path, {
      // No `addLink`: there's nothing to crawl when pages are rendered as
      // they're requested.
      basepath,
      renderToStreamOptions,
    });

    if ("redirect" in page) {
      res.redirect(toServedHref(page.redirect, basepath));
      return;
    }

    page.stream.on("error", (error) => {
      next(error);
    });

    page.stream.pipe(res);
  };
}
