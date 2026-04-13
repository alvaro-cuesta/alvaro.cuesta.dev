import { makeSite } from "../src/site";
import { OUTPUT_FOLDER } from "../config";
import { buildXenonExpressSite } from "xenon-ssg-express/src/build";

const main = async () => {
  await buildXenonExpressSite(makeSite(), {
    outputDir: OUTPUT_FOLDER,
    entryPaths: new Set(["", "404.html"]),
  });
};

main();
