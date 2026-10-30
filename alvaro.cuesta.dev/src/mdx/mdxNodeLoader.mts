import type { LoadHookSync } from "node:module";
import {
  MessageChannel,
  receiveMessageOnPort,
  Worker,
} from "node:worker_threads";
import type {
  MdxCompilerRequest,
  MdxCompilerResponse,
  MdxCompilerWorkerData,
} from "./mdxCompilerWorker.mts";

// The same extensions `@mdx-js/mdx` detects (from `markdown-extensions`):
// `compileSync` compiles the Markdown ones as plain Markdown and `.mdx` as MDX.
const EXTENSIONS = [
  ".md",
  ".markdown",
  ".mdown",
  ".mkdn",
  ".mkd",
  ".mdwn",
  ".mkdown",
  ".ron",
  ".mdx",
];

// Compile on a thread of their own: loading the compiler and its plugins takes
// a while, and there it happens while this thread starts the app, instead of
// before.
const { port1: port, port2: workerPort } = new MessageChannel();
const signal = new Int32Array(new SharedArrayBuffer(4));
const worker = new Worker(new URL("./mdxCompilerWorker.mts", import.meta.url), {
  workerData: { port: workerPort, signal } satisfies MdxCompilerWorkerData,
  transferList: [workerPort],
  // Not this thread's flags: they `--import` this module (and tsx), which would
  // start a worker from the worker. Node strips the types itself.
  execArgv: [],
});
// Don't keep the process alive, e.g. once a build is done.
worker.unref();

const compileMdx = (url: string): string => {
  Atomics.store(signal, 0, 0);
  port.postMessage({ url } satisfies MdxCompilerRequest);
  Atomics.wait(signal, 0, 0);

  const response = receiveMessageOnPort(port)?.message as MdxCompilerResponse;
  if ("error" in response) {
    throw response.error;
  }
  return response.source;
};

/**
 * Compiles `.mdx` (and Markdown) imports to JS modules. Sync, as
 * `module.registerHooks()` requires: it blocks this thread until the worker has
 * compiled the file.
 */
export const load: LoadHookSync = (url, context, nextLoad) => {
  const fileUrl = new URL(url);

  if (
    fileUrl.protocol !== "file:" ||
    !EXTENSIONS.some((ext) => fileUrl.pathname.endsWith(ext))
  ) {
    return nextLoad(url, context);
  }

  return {
    format: "module",
    shortCircuit: true,
    source: compileMdx(url),
  };
};
