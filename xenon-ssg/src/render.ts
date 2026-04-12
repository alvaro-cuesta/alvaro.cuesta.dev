import { prerenderToNodeStream } from "react-dom/static";
import {
  PassThrough,
  Readable,
  Transform,
  type TransformCallback,
} from "node:stream";
import fs from "node:fs/promises";
import type { ReactNode } from "react";
import type { PathLike } from "node:fs";

// Matches React's placeholder comments:
// - <!-- --> (text node separator)
// - <!--$-->, <!--/$-->, <!--$?--> (Suspense boundary markers)
// - <!--html-->, <!--head-->, <!--body--> (React 19 section markers from prerender)
const REACT_COMMENT_RE = /<!--(?: |\/?\$\??|html|head|body)-->/g;

// Max length of a React comment (<!--html-->) so we can handle chunk boundaries
const MAX_COMMENT_LENGTH = "<!--html-->".length;

export class StripReactComments extends Transform {
  private tail = "";

  constructor() {
    super({ decodeStrings: false, encoding: "utf-8" });
  }

  override _transform(
    chunk: string,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    const data = this.tail + chunk;

    // Find a safe cut point: any `<` in the last MAX_COMMENT_LENGTH-1 chars
    // could be the start of a comment split across chunks
    let cutPoint = data.length;
    for (
      let i = data.length - 1;
      i >= Math.max(0, data.length - MAX_COMMENT_LENGTH + 1);
      i--
    ) {
      if (data[i] === "<") {
        cutPoint = i;
        break;
      }
    }

    this.tail = data.slice(cutPoint);
    callback(null, data.slice(0, cutPoint).replace(REACT_COMMENT_RE, ""));
  }

  override _flush(callback: TransformCallback) {
    callback(null, this.tail.replace(REACT_COMMENT_RE, ""));
  }
}

export type RenderToStreamOptions = {
  /**
   * The maximum time in milliseconds that the rendering process is allowed to take.
   *
   * This is important because we allow async/suspending components, and we don't want to
   * wait forever in case a component takes too long to resolve. Also in case there is an
   * infinite loop.
   *
   * - If the timeout is reached, the rendering process will be aborted and an error will
   *   be emitted by the stream.
   *
   * - If not provided, the rendering process will not have a timeout.
   */
  timeoutMsecs?: number;
};

/**
 * Render a React node to a stream.
 *
 * Uses React 19's `prerenderToNodeStream` — the proper SSG API that waits for all async
 * components / Suspense boundaries to resolve before emitting the final HTML.
 *
 * Will return a readable stream that will emit the HTML content of the React node.
 *
 * If there is an error, the stream will emit an error and close.
 */
export const renderToStream = (
  reactNode: ReactNode,
  options: RenderToStreamOptions = {},
): Readable => {
  const passthrough = new PassThrough();

  const controller = new AbortController();

  let timeoutHandle: NodeJS.Timeout | undefined;
  if (options.timeoutMsecs !== undefined) {
    timeoutHandle = setTimeout(() => {
      controller.abort(new Error("Timed out while rendering"));
    }, options.timeoutMsecs);
  }

  passthrough.on("close", () => {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  });

  prerenderToNodeStream(reactNode, {
    signal: controller.signal,
    onError(error) {
      // We inject the error into the stream so the stream consumers notice it
      const streamError =
        error instanceof Error ? error : new Error(String(error));
      passthrough.destroy(streamError);
    },
  }).then(
    ({ prelude, postponed }) => {
      // xenon-ssg is a pure SSG: every page must fully resolve at build time.
      // If `postponed` is non-null, a component threw `unstable_postpone`, which
      // only makes sense in hybrid static+dynamic setups that call `resumeAndPrerenderToNodeStream`
      // at request time. We have no request-time runtime, so treat this as a build error
      // instead of silently shipping HTML with unresolved `<!--$?-->` fallback holes.
      if (postponed !== null) {
        passthrough.destroy(
          new Error(
            "xenon-ssg render produced a postponed state, but this renderer only supports full prerendering. " +
              "Remove any `unstable_postpone` calls or introduce a resume-capable render path.",
          ),
        );
        return;
      }
      prelude.pipe(new StripReactComments()).pipe(passthrough);
    },
    (error) => {
      const streamError =
        error instanceof Error ? error : new Error(String(error));
      passthrough.destroy(streamError);
    },
  );

  return passthrough;
};

/**
 * Render a React node to a string.
 *
 * Unlike `renderToStaticMarkup`, this supports React Suspense and async components.
 */
export const renderToString = async (
  reactNode: ReactNode,
  options?: RenderToStreamOptions,
): Promise<string> => {
  const stream = renderToStream(reactNode, options);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
};

/**
 * Render a React node to a file.
 */
const renderToFile = async (
  path: PathLike | fs.FileHandle,
  reactNode: ReactNode,
  options?: RenderToStreamOptions,
) => {
  const stream = renderToStream(reactNode, options);
  await fs.writeFile(path, stream);
};

/**
 * Render a React node to a file atomically.
 *
 * This means that the file will be written to a temporary file first, and then renamed to the final
 * path to avoid truncating the original file if the render process files in the middle of writing
 * the file.
 */
export const renderToFileAtomic = async (
  path: string,
  reactNode: ReactNode,
  options?: RenderToStreamOptions,
) => {
  const uniqueId = Math.random().toString(36).slice(2);
  const timestamp = Date.now();

  const tempPath = `${path}.${uniqueId}-${timestamp}.tmp`;

  try {
    await renderToFile(tempPath, reactNode, options);
    await fs.rename(tempPath, path);
  } catch (error) {
    await fs.unlink(tempPath);
    throw error;
  }
};
