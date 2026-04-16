import { makeSite } from "../src/site.tsx";
import { OUTPUT_FOLDER } from "../config.ts";
import { buildXenonExpressSite } from "xenon-ssg-express/build";

const main = async () => {
  await buildXenonExpressSite(makeSite(), {
    outputDir: OUTPUT_FOLDER,
    entryPaths: new Set(["", "404.html"]),
  });
};

main();
