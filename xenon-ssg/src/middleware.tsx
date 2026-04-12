import { type RenderToStreamOptions, renderToStream } from "./render";
import { canonicalizeHref } from "./url";
import { Root } from "./Root";
// TODO: Make this a generic middleware and not Express-specific (if such a thing exists)
import type { Request, Response, NextFunction } from "express";
import type { XenonRenderFunction } from ".";
import type { UnknownRecord } from "type-fest";

const doNothing = () => {};

export function makeXenonMiddleware<PageMetadata extends UnknownRecord>(
  render: XenonRenderFunction<PageMetadata>,
  options?: RenderToStreamOptions,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { pathname } = canonicalizeHref(req.path);

    let renderedStream;
    try {
      renderedStream = renderToStream(
        <Root
          // We don't have to crawl links in middleware mode since we're not pre-rendering anything
          addLink={doNothing}
        >
          {render(pathname).reactNode}
        </Root>,
        options,
      );
    } catch (error) {
      if (error instanceof NeedsTrailingSlashError) {
        res.redirect(`${pathname}/`);
        return;
      }

      return next(error);
    }

    renderedStream.on("error", (error) => {
      next(error);
    });

    renderedStream.pipe(res);
  };
}

export class NeedsTrailingSlashError extends Error {
  constructor(path: string) {
    super(`Path "${path}" needs a trailing slash`);
  }
}
