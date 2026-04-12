import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import type {
  Plugin,
  PluginAttachToExpressFunction,
  PluginBuildPreFunction,
} from "./plugins";

type StaticFolderPluginOptions = {
  inputFolder: string;
  mountPointFragments?: string[];
};

export const staticFolderPlugin =
  ({
    inputFolder,
    mountPointFragments = [],
  }: StaticFolderPluginOptions): Plugin =>
  () => {
    const pathname = `/${mountPointFragments.join("/")}`;

    const attachToExpress: PluginAttachToExpressFunction = (app) => {
      app.use(pathname, express.static(inputFolder));
    };

    const buildPre: PluginBuildPreFunction = async ({
      baseOutputFolder,
      emitStaticPathname,
    }) => {
      const outputFolder = path.join(baseOutputFolder, ...mountPointFragments);

      console.debug(`[Static folder] ${inputFolder} -> ${outputFolder}`);

      await fs.mkdir(outputFolder, { recursive: true });
      await fs.cp(inputFolder, outputFolder, { recursive: true });

      // Walk the copied tree and declare every file as a static pathname so
      // the link crawler skips it instead of queueing it for rendering.
      const walk = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(entryPath);
          } else if (entry.isFile()) {
            const relative = path
              .relative(inputFolder, entryPath)
              .split(path.sep)
              .join("/");
            emitStaticPathname(`/${[...mountPointFragments, relative].join("/")}`);
          }
        }
      };
      await walk(inputFolder);
    };

    return {
      attachToExpress,
      buildPre,
    };
  };
