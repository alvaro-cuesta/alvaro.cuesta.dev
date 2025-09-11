import { startXenonExpressDevApp } from "xenon-ssg-express/src/dev";
import { makeSite } from "../src/site";

const main = async () => {
  const site = await makeSite();
  startXenonExpressDevApp(site);
};

main();
