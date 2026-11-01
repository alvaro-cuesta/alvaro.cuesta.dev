import type { LoadHookSync } from "node:module";
import {
  MessageChannel,
  receiveMessageOnPort,
  Worker,
} from "node:worker_threads";
import {
  SIGNAL,
  type MdxCompilerRequest,
  type MdxCompilerResponse,
  type MdxCompilerSupervisorData,
} from "./mdxCompilerProtocol.mts";

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
// before. Started by a supervisor, which tells this thread if it dies.
const { port1: port, port2: compilerPort } = new MessageChannel();
const { port1: deathPort, port2: supervisorDeathPort } = new MessageChannel();
const signal = new Int32Array(new SharedArrayBuffer(4));
Atomics.store(signal, 0, SIGNAL.ANSWERED);
const supervisorUrl = new URL("./mdxCompilerSupervisor.mts", import.meta.url);
const supervisor = new Worker(supervisorUrl, {
  workerData: {
    port: compilerPort,
    signal,
    deathPort: supervisorDeathPort,
  } satisfies MdxCompilerSupervisorData,
  transferList: [compilerPort, supervisorDeathPort],
  // Not this thread's flags: they `--import` this module (and tsx), which would
  // start a supervisor from the supervisor. Node strips the types itself.
  execArgv: [],
});
// Don't keep the process alive, e.g. once a build is done.
supervisor.unref();

// Once it dies, for every compile after.
let compilerDeath: Error | undefined;
const failOnDeath = (): never => {
  compilerDeath ??= new Error(
    `The MDX compiler died: ${receiveMessageOnPort(deathPort)?.message as string}`,
  );
  throw compilerDeath;
};

const compileMdx = (url: string): string => {
  // Not if it died while nothing was waiting: then nothing would wake this.
  if (
    Atomics.compareExchange(signal, 0, SIGNAL.ANSWERED, SIGNAL.WAITING) ===
    SIGNAL.DIED
  ) {
    failOnDeath();
  }
  port.postMessage({ url } satisfies MdxCompilerRequest);
  // No timeout: the supervisor wakes this if the compiler dies, and a compile
  // can legitimately take long.
  Atomics.wait(signal, 0, SIGNAL.WAITING);

  // Even if it died right after answering.
  const response = receiveMessageOnPort(port)?.message as
    | MdxCompilerResponse
    | undefined;
  if (response === undefined) {
    return failOnDeath();
  }
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
