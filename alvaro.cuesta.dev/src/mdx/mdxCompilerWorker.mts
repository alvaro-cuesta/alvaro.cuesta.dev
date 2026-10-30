// The thread `mdxNodeLoader.mts` compiles `.mdx` files on. See there.

import { fileURLToPath } from "node:url";
import { type MessagePort, workerData } from "node:worker_threads";

export type MdxCompilerWorkerData = {
  port: MessagePort;
  /** Set to 1 after posting each response, so the main thread can wait for it. */
  signal: Int32Array;
};

export type MdxCompilerRequest = { url: string };

export type MdxCompilerResponse = { source: string } | { error: unknown };

const { port, signal } = workerData as MdxCompilerWorkerData;

// Start loading right away, while the main thread starts the app.
const compilerPromise = import("./mdxCompiler.mts");
// Reported to each request instead of crashing the worker.
compilerPromise.catch(() => {});

port.on("message", async ({ url }: MdxCompilerRequest) => {
  let response: MdxCompilerResponse;
  try {
    const { compileMdx } = await compilerPromise;
    response = { source: compileMdx(new URL(url)) };
  } catch (error) {
    // Only an error's `message`, `stack` and `cause` survive the trip to the main
    // thread, so put the file and e.g. a `VFileMessage`'s position (its `name`)
    // in the message.
    response = {
      error: new Error(`${fileURLToPath(url)}: ${String(error)}`, {
        cause: error,
      }),
    };
  }

  port.postMessage(response);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
