import { renderToPipeableStream } from "react-dom/server";
import { PassThrough, Readable } from "node:stream";
import fs from "node:fs/promises";
import type { ReactNode } from "react";
import type { PathLike } from "node:fs";

export type RenderToStreamOptions = {
  /**
   * The maximum time in milliseconds that the rendering process is allowed to take.
   *
   * This is important because we allow suspending components to be rendered, and we don't want to
   * wait forever in case a component takes too long to resolve. Also in case there is an infinite
   * loop.
   *
   * - If the timeout is reached, the rendering process will be aborted and an error will be emitted
   *   by the stream.
   *
   * - If not provided, the rendering process will not have a timeout.
   */
  timeoutMsecs?: number;
};

/**
 * Render a React node to a stream.
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

  if (options.timeoutMsecs !== undefined) {
    const timeoutHandle = setTimeout(() => {
      abort("Timed out while rendering");
    }, options.timeoutMsecs);

    // @todo do I need to handle errors specially?
    passthrough.on("close", () => {
      clearTimeout(timeoutHandle);
    });
  }

  const { pipe, abort } = renderToPipeableStream(reactNode, {
    onError(error, _errorInfo) {
      // This will get called if `abort` is called while processing a Suspended component
      // TODO: When else does this happen?
      // TODO: Is `errorInfo` ever NOT undefined?
      // TODO: What about error boundaries?

      // We inject the error into the stream so the stream consumers notice it
      // If we don't do this, the stream will just emit a fallback `<template>` that will try
      // recovering in the client, which is not what we want in this case (we are SSG only!)
      const streamError =
        error instanceof Error ? error : new Error(String(error));
      passthrough.destroy(streamError);

      return "Got an error while rendering a suspended component";
    },
    onShellError(error) {
      // TODO: When does this happen?
      // TODO: What about error boundaries?
      console.error(error);
    },
    onAllReady() {
      pipe(passthrough);
    },
  });

  return passthrough;
};

/**
 * Render a React node to a string.
 *
 * Unlike `renderToStaticMarkup`, this supports React Suspense.
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

/*

TODO: Do I want to expose or use any of these?

    identifierPrefix?: string;
    namespaceURI?: string;
    nonce?: string;
    bootstrapScriptContent?: string;
    bootstrapScripts?: string[];
    bootstrapModules?: string[];
    progressiveChunkSize?: number;
    onShellReady?: () => void;
    onShellError?: (error: unknown) => void;
    onAllReady?: () => void;
    onError?: (error: unknown, errorInfo: ErrorInfo) => string | void;

    */
