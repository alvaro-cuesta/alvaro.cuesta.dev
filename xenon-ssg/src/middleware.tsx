import { type RenderToStreamOptions, renderToStream } from "./render.ts";
import { canonicalizeHref } from "./url.ts";
import { Root } from "./Root.tsx";
// TODO: Make this a generic middleware and not Express-specific (if such a thing exists)
import type { Request, Response, NextFunction } from "express";
import type { XenonRenderFunction } from "./index.ts";
import type { UnknownRecord } from "type-fest";

const doNothing = () => {};

export function makeXenonMiddleware<PageMetadata extends UnknownRecord>(
  render: XenonRenderFunction<PageMetadata>,
  options?: RenderToStreamOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { pathname } = canonicalizeHref(req.path);

    let renderedStream;
    try {
      const { reactNode, metadata } = await render(pathname);
      // Only the build reads metadata. Don't let a rejection crash the dev server.
      Promise.resolve(metadata).catch(doNothing);
      renderedStream = renderToStream(
        <Root
          // We don't have to crawl links in middleware mode since we're not pre-rendering anything
          addLink={doNothing}
        >
          {reactNode}
        </Root>,
        options,
      );
    } catch (error) {
      if (error instanceof NeedsTrailingSlashError) {
        res.redirect(`${pathname}/`);
        return;
      }

      // Let Express 5's async-handler error catching forward this to the
      // error middleware chain. We only intercept `NeedsTrailingSlashError`
      // above because it needs to be converted into a redirect; every
      // other error just re-throws.
      throw error;
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
