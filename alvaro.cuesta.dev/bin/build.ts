import { makeSite } from "../src/site";
import { OUTPUT_FOLDER } from "../config";
import { buildXenonExpressSite } from "xenon-ssg-express/src/build";

const main = async () => {
  const site = await makeSite();

  await buildXenonExpressSite(site, {
    outputDir: OUTPUT_FOLDER,
    entryPaths: new Set(["", "404.html"]),
  });
};

main();
