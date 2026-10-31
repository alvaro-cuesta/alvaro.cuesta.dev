import { Readable } from "node:stream";

/**
 * Turn a complete readable stream into a string.
 */
export const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
};
