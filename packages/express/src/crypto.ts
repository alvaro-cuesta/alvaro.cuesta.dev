import crypto from "node:crypto";
import fs from "node:fs/promises";

export const getFileHash = async (
  filepath: string,
  encoding: crypto.BinaryToTextEncoding,
): Promise<string> => {
  const hash = crypto.createHash("sha256");
  const file = await fs.open(filepath, "r");
  const stream = file.createReadStream();

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest(encoding);
};

export const getContentHash = async (
  input: string | NodeJS.ArrayBufferView,
  encoding: crypto.BinaryToTextEncoding,
): Promise<string> => {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  return hash.digest(encoding);
};
