import { makeSite } from "../src/site.tsx";
import { OUTPUT_FOLDER, SITE_ORIGIN } from "../config.ts";
import { buildXenonExpressSite } from "@xenon-ssg/express/build";

const main = async () => {
  await buildXenonExpressSite(makeSite(), {
    origin: process.env["XENON_ORIGIN"] ?? SITE_ORIGIN,
    basepath: process.env["XENON_BASE_PATH"],
    outputDir: OUTPUT_FOLDER,
    entryPaths: new Set(["", "404.html"]),
  });
};

main();
