// How `mdxNodeLoader.mts`, `mdxCompilerSupervisor.mts` and
// `mdxCompilerWorker.mts` talk to each other. Apart from them, as none can
// import another without running it.

import type { MessagePort } from "node:worker_threads";

/** What `signal` holds: the main thread blocks while it's `WAITING`. */
export const SIGNAL = {
  WAITING: 0,
  ANSWERED: 1,
  /** For good: the compiler can't answer anymore. */
  DIED: 2,
} as const;

export type MdxCompilerSupervisorData = {
  port: MessagePort;
  signal: Int32Array;
  /** Where the supervisor posts why the compiler died, as text. */
  deathPort: MessagePort;
};

export type MdxCompilerWorkerData = {
  port: MessagePort;
  /** Set to `ANSWERED` after posting each response, so the main thread can wait for it. */
  signal: Int32Array;
};

export type MdxCompilerRequest = { url: string };

export type MdxCompilerResponse = { source: string } | { error: unknown };
