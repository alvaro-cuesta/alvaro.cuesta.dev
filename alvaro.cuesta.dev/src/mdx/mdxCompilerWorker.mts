// The thread `mdxNodeLoader.mts` compiles `.mdx` files on. See there.

import { fileURLToPath } from "node:url";
import { workerData } from "node:worker_threads";
import {
  SIGNAL,
  type MdxCompilerRequest,
  type MdxCompilerResponse,
  type MdxCompilerWorkerData,
} from "./mdxCompilerProtocol.mts";

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
  Atomics.store(signal, 0, SIGNAL.ANSWERED);
  Atomics.notify(signal, 0);
});
