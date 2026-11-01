// The thread that starts `mdxCompilerWorker.mts`, and tells the main thread if
// it dies. The main thread can't tell itself: it blocks while it waits for the
// compiler, and a worker's death is only reported as an event, on the event
// loop of the thread that started it. Nor can the compiler: some deaths (e.g.
// running out of memory) end it before any of its code runs.

import { Worker, workerData } from "node:worker_threads";
import {
  SIGNAL,
  type MdxCompilerSupervisorData,
  type MdxCompilerWorkerData,
} from "./mdxCompilerProtocol.mts";

const { port, signal, deathPort } = workerData as MdxCompilerSupervisorData;

const compiler = new Worker(
  new URL("./mdxCompilerWorker.mts", import.meta.url),
  {
    workerData: { port, signal } satisfies MdxCompilerWorkerData,
    transferList: [port],
  },
);

// Emitted before `exit`, when it dies of an error.
let error: unknown;
compiler.on("error", (compilerError) => {
  error = compilerError;
});

compiler.on("exit", (code) => {
  // As text: the error from an `error` event loses its message when posted.
  deathPort.postMessage(
    error instanceof Error ? error.message : `It exited with code ${code}`,
  );
  Atomics.store(signal, 0, SIGNAL.DIED);
  Atomics.notify(signal, 0);
});
